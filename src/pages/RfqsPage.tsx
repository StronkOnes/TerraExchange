import React, {useCallback, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Plus, MessageSquare, Calculator, Check, X, Star} from 'lucide-react';
import type {
  CommodityTemplate,
  MarketplaceCorridor,
  MarketplaceListing,
  QuotationRecord,
  RfqRecord,
} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {VerificationLabel} from '../components/VerificationBadge';

interface EnrichedRfq extends RfqRecord {
  quotationCount: number;
  quotations: QuotationRecord[];
}

export function RfqsPage() {
  const {apiFetch, user, business} = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rfqs, setRfqs] = useState<EnrichedRfq[]>([]);
  const [commodities, setCommodities] = useState<CommodityTemplate[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(searchParams.get('new') === '1');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create RFQ Form State
  const [rfqCorridor, setRfqCorridor] = useState<MarketplaceCorridor>('CN-ZA');
  const [rfqCommoditySlug, setRfqCommoditySlug] = useState(
    searchParams.get('commodity') || 'manganese-ore'
  );
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqQty, setRfqQty] = useState('5000');
  const [rfqDestination, setRfqDestination] = useState('Durban Port, South Africa');
  const [rfqIncoterm, setRfqIncoterm] = useState('CIF Durban');
  const [rfqBudget, setRfqBudget] = useState('');
  const [rfqDeadline, setRfqDeadline] = useState('2026-12-20');
  const [rfqNotes, setRfqNotes] = useState('');
  const [rfqSpecs, setRfqSpecs] = useState<Record<string, string>>({});

  // Submit Quotation Form State
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMoq, setQuoteMoq] = useState('');
  const [quoteIncoterm, setQuoteIncoterm] = useState('CIF Durban');
  const [quoteLeadDays, setQuoteLeadDays] = useState('28');
  const [quoteNotes, setQuoteNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rfqRes, comRes] = await Promise.all([
        apiFetch<{rfqs: EnrichedRfq[]}>('/rfqs'),
        apiFetch<{commodities: CommodityTemplate[]}>('/commodities'),
      ]);
      setRfqs(rfqRes.rfqs);
      setCommodities(comRes.commodities);
      if (rfqRes.rfqs.length > 0) {
        setSelectedRfqId((prev) => prev || rfqRes.rfqs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load RFQs.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pre-fill from ?listingId=
  useEffect(() => {
    const listingId = searchParams.get('listingId');
    if (!listingId) return;
    apiFetch<{listing: MarketplaceListing}>(`/listings/${listingId}`)
      .then((res) => {
        const l = res.listing;
        setShowCreateForm(true);
        setRfqCorridor(l.corridor);
        setRfqCommoditySlug(l.commoditySlug);
        setRfqTitle(`RFQ: ${l.commodityName} (${l.minOrderQuantity}–${l.quantity} ${l.unit})`);
        setRfqQty(String(l.minOrderQuantity || l.quantity));
        if (l.pricePerUnit) setRfqBudget(String(l.pricePerUnit));
      })
      .catch(() => {});
  }, [apiFetch, searchParams]);

  const selectedCommodity = commodities.find((c) => c.slug === rfqCommoditySlug);
  const selectedRfq = rfqs.find((r) => r.id === selectedRfqId) || null;

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      const invitedId = searchParams.get('inviteBusinessId');
      const res = await apiFetch<{rfq: EnrichedRfq}>('/rfqs', {
        method: 'POST',
        body: JSON.stringify({
          corridor: rfqCorridor,
          commoditySlug: rfqCommoditySlug,
          title: rfqTitle,
          specifications: rfqSpecs,
          quantity: Number(rfqQty),
          unit: selectedCommodity?.defaultUnit || 'MT',
          destinationPortOrCity: rfqDestination,
          preferredOrigin: 'Verified Origins',
          incotermPreference: rfqIncoterm,
          targetBudgetPerUnit: rfqBudget ? Number(rfqBudget) : undefined,
          currency: 'USD',
          responseDeadline: rfqDeadline,
          requiredCertifications: ['Certificate of Origin', 'Pre-Shipment Inspection'],
          invitedBusinessIds: invitedId ? [invitedId] : [],
          linkedListingId: searchParams.get('listingId') || undefined,
          notes: rfqNotes,
        }),
      });
      setRfqs((prev) => [res.rfq, ...prev]);
      setSelectedRfqId(res.rfq.id);
      setShowCreateForm(false);
      setSearchParams({});
      setFeedback(`Issued ${res.rfq.referenceCode} to matching suppliers.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create RFQ.');
    }
  };

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq) return;
    setError(null);
    setFeedback(null);
    try {
      await apiFetch(`/rfqs/${selectedRfq.id}/quotations`, {
        method: 'POST',
        body: JSON.stringify({
          pricePerUnit: Number(quotePrice),
          currency: selectedRfq.currency,
          minimumQuantity: Number(quoteMoq) || selectedRfq.quantity,
          incoterm: quoteIncoterm,
          originLocation: business?.city || 'Export Port',
          estimatedLeadTimeDays: Number(quoteLeadDays) || 21,
          validityDate: '2026-12-31',
          attachedDocuments: ['Commercial Spec Sheet', 'Origin Declaration'],
          technicalNotes: quoteNotes,
        }),
      });
      setQuotePrice('');
      setQuoteNotes('');
      setFeedback(`Quotation submitted for ${selectedRfq.referenceCode}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit quotation.');
    }
  };

  const handleQuotationAction = async (
    quoteId: string,
    status: 'shortlisted' | 'accepted' | 'rejected'
  ) => {
    setError(null);
    setFeedback(null);
    try {
      await apiFetch(`/quotations/${quoteId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({status}),
      });
      setFeedback(`Quotation updated to ${status}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update quotation status.');
    }
  };

  const isBuyerOwner = Boolean(
    user && selectedRfq && selectedRfq.buyerBusinessId === user.businessId
  );

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">
            Structured Procurement &amp; Quotation Engine
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            RFQ &amp; Supplier Quotation Workspace
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Issue technical RFQs, receive confidential supplier offers, compare Incoterms and landed
            costs side by side, and shortlist or award agreements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Close RFQ Form' : 'New Procurement RFQ'}</span>
        </button>
      </div>

      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <span>
            Sign in with a commercial business account (or select a Demo Buyer/Supplier on Sign In) to
            issue RFQs, view confidential quotations, or submit quotes.
          </span>
          <Link
            to="/auth"
            className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-md whitespace-nowrap self-start sm:self-auto"
          >
            Sign In / Demo Accounts
          </Link>
        </div>
      )}

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-4 mb-6">
          {feedback}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Create RFQ Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateRfq}
          className="bg-white border border-slate-200 rounded-lg p-6 mb-8 space-y-6"
        >
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Create New Request for Quotation (RFQ)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Corridor</label>
              <select
                value={rfqCorridor}
                onChange={(e) => setRfqCorridor(e.target.value as MarketplaceCorridor)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              >
                <option value="CN-ZA">China ↔ South Africa</option>
                <option value="SA">TerraExchange SA Domestic</option>
                <option value="GLOBAL">TerraExchange Global</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Commodity Template
              </label>
              <select
                value={rfqCommoditySlug}
                onChange={(e) => {
                  setRfqCommoditySlug(e.target.value);
                  setRfqSpecs({});
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              >
                {commodities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Response Deadline
              </label>
              <input
                type="date"
                value={rfqDeadline}
                onChange={(e) => setRfqDeadline(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Procurement Requirement Title
              </label>
              <input
                type="text"
                value={rfqTitle}
                onChange={(e) => setRfqTitle(e.target.value)}
                required
                placeholder="e.g. 10,000 MT Manganese Lump (38% Mn Min)"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Required Quantity ({selectedCommodity?.defaultUnit || 'MT'})
              </label>
              <input
                type="number"
                min="1"
                value={rfqQty}
                onChange={(e) => setRfqQty(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Budget / Unit (USD)
              </label>
              <input
                type="number"
                value={rfqBudget}
                onChange={(e) => setRfqBudget(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Delivery Destination (Port / Facility)
              </label>
              <input
                type="text"
                value={rfqDestination}
                onChange={(e) => setRfqDestination(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Preferred Incoterms
              </label>
              <input
                type="text"
                value={rfqIncoterm}
                onChange={(e) => setRfqIncoterm(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
          </div>

          {/* Dynamic Commodity Spec Inputs */}
          {selectedCommodity && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-800 mb-3">
                Commodity Technical Parameters ({selectedCommodity.name})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {selectedCommodity.specFields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-600 mb-1">
                      {f.label}
                      {f.unit ? ` (${f.unit})` : ''}
                    </label>
                    {f.type === 'select' ? (
                      <select
                        value={rfqSpecs[f.key] || ''}
                        onChange={(e) =>
                          setRfqSpecs((prev) => ({...prev, [f.key]: e.target.value}))
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                      >
                        <option value="">Select...</option>
                        {f.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type}
                        step="any"
                        value={rfqSpecs[f.key] || ''}
                        onChange={(e) =>
                          setRfqSpecs((prev) => ({...prev, [f.key]: e.target.value}))
                        }
                        placeholder={f.placeholder}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Additional Commercial &amp; Inspection Requirements
            </label>
            <textarea
              rows={2}
              value={rfqNotes}
              onChange={(e) => setRfqNotes(e.target.value)}
              placeholder="Specify inspection agencies (e.g. SGS), payment terms (e.g. LC at sight), or packaging..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!user}
              className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-md"
            >
              Publish RFQ
            </button>
          </div>
        </form>
      )}

      {/* Split Workspace: Left RFQ List + Right Detail & Quotation Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Active &amp; Accessible RFQs ({rfqs.length})
          </h2>
          {loading ? (
            <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            rfqs.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRfqId(r.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedRfqId === r.id
                    ? 'bg-white border-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-mono font-medium text-slate-700">{r.referenceCode}</span>
                  <span className="capitalize font-medium text-amber-700">
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="font-display text-sm font-semibold text-slate-900 line-clamp-2 mb-1.5">
                  {r.title}
                </p>
                <div className="text-xs text-slate-600 flex items-center justify-between">
                  <span className="truncate">{r.buyerBusinessName}</span>
                  <span className="font-mono tabular-nums shrink-0 ml-2">
                    {r.quotationCount} quotes
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-8">
          {!selectedRfq ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-600">
              Select an RFQ from the left queue to inspect specifications and compare quotations.
            </div>
          ) : (
            <div className="space-y-6">
              {/* RFQ Specification Card */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedRfq.referenceCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedRfq.corridor}</span>
                      <span aria-hidden="true">·</span>
                      <span>Deadline {selectedRfq.responseDeadline}</span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      {selectedRfq.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Issued by{' '}
                      <Link
                        to={`/businesses/${selectedRfq.buyerBusinessId}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {selectedRfq.buyerBusinessName}
                      </Link>{' '}
                      ({selectedRfq.buyerCountry})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Target Volume</span>
                    <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {selectedRfq.quantity.toLocaleString()} {selectedRfq.unit}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block">Destination</span>
                    <span className="font-medium text-slate-900">
                      {selectedRfq.destinationPortOrCity}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Incoterm Preference</span>
                    <span className="font-medium text-slate-900">
                      {selectedRfq.incotermPreference}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Target Budget</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {selectedRfq.targetBudgetPerUnit
                        ? `${selectedRfq.currency} ${selectedRfq.targetBudgetPerUnit.toLocaleString()}/${selectedRfq.unit}`
                        : 'Open Market'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status</span>
                    <span className="font-semibold text-amber-700 capitalize">
                      {selectedRfq.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {selectedRfq.notes && (
                  <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                    <span className="font-semibold text-slate-800">Procurement Notes:</span>{' '}
                    {selectedRfq.notes}
                  </p>
                )}
              </div>

              {/* Received Quotations Comparison */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Quotations &amp; Offer Comparison ({selectedRfq.quotations.length} visible)
                  </h3>
                  <Link
                    to={`/intelligence?tab=calculator&commodity=${encodeURIComponent(
                      selectedRfq.commodityName
                    )}&qty=${selectedRfq.quantity}&unit=${encodeURIComponent(selectedRfq.unit)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:underline"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Open Landed Cost Calculator</span>
                  </Link>
                </div>

                {selectedRfq.quotations.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    {user
                      ? 'No quotations visible for your account on this RFQ yet.'
                      : 'Supplier quotations are confidential to the issuing buyer and submitting supplier. Sign in as the buyer or supplier to inspect quotes.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                          <th className="py-2.5 px-3">Supplier</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3">Incoterm</th>
                          <th className="py-2.5 px-3 text-right">Lead Time</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRfq.quotations.map((q) => (
                          <tr key={q.id}>
                            <td className="py-3 px-3">
                              <Link
                                to={`/businesses/${q.supplierBusinessId}`}
                                className="font-semibold text-slate-900 hover:underline block"
                              >
                                {q.supplierBusinessName}
                              </Link>
                              <VerificationLabel level={q.supplierVerificationLevel} compact />
                              <p className="text-slate-500 mt-1 max-w-xs">{q.technicalNotes}</p>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                              {q.currency} {q.pricePerUnit.toLocaleString()} / {q.unit}
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                              {q.incoterm}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              {q.estimatedLeadTimeDays} days
                            </td>
                            <td className="py-3 px-3 capitalize font-medium text-slate-800 whitespace-nowrap">
                              {q.status}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                              {isBuyerOwner && q.status !== 'accepted' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuotationAction(q.id, 'shortlisted')}
                                    title="Shortlist quotation"
                                    className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded hover:bg-slate-50"
                                  >
                                    <Star className="w-3 h-3 text-amber-600" />
                                    <span>Shortlist</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuotationAction(q.id, 'accepted')}
                                    title="Accept quotation"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-700 text-white rounded hover:bg-emerald-600"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Accept</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuotationAction(q.id, 'rejected')}
                                    title="Reject quotation"
                                    className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              <Link
                                to={`/messages?toBusinessId=${q.supplierBusinessId}&rfqId=${selectedRfq.id}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-slate-700 hover:text-slate-900"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Message</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Supplier Submit Quotation Box */}
              {user && !isBuyerOwner && (
                <form
                  onSubmit={handleSubmitQuotation}
                  className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
                >
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Submit Supplier Quotation for {selectedRfq.referenceCode}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Unit Price ({selectedRfq.currency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Min Qty ({selectedRfq.unit})
                      </label>
                      <input
                        type="number"
                        value={quoteMoq}
                        onChange={(e) => setQuoteMoq(e.target.value)}
                        placeholder={String(selectedRfq.quantity)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Delivery Terms
                      </label>
                      <input
                        type="text"
                        value={quoteIncoterm}
                        onChange={(e) => setQuoteIncoterm(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Lead Time (Days)
                      </label>
                      <input
                        type="number"
                        value={quoteLeadDays}
                        onChange={(e) => setQuoteLeadDays(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Technical &amp; Payment Notes
                    </label>
                    <textarea
                      rows={2}
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      placeholder="Include assay tolerances, loading port schedule, and payment terms..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md"
                  >
                    Submit Binding Quotation
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
