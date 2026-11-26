import React, {useCallback, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Plus, FileCheck2, PauseCircle, PlayCircle, ExternalLink} from 'lucide-react';
import type {
  CommodityTemplate,
  ListingType,
  MarketplaceCorridor,
  MarketplaceListing,
  SellerDisclosureRole,
} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {VerificationLabel} from '../components/VerificationBadge';

export function DashboardPage() {
  const {apiFetch, user, business, updateBusiness} = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab =
    searchParams.get('tab') === 'create-listing'
      ? 'create-listing'
      : searchParams.get('tab') === 'verification'
      ? 'verification'
      : 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'create-listing' | 'verification'>(
    initialTab
  );

  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [commodities, setCommodities] = useState<CommodityTemplate[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listing Builder State
  const [lType, setLType] = useState<ListingType>('supply');
  const [lCorridor, setLCorridor] = useState<MarketplaceCorridor>('CN-ZA');
  const [lCommoditySlug, setLCommoditySlug] = useState(
    searchParams.get('commodity') || 'manganese-ore'
  );
  const [lTitle, setLTitle] = useState('');
  const [lDesc, setLDesc] = useState('');
  const [lQty, setLQty] = useState('5000');
  const [lMoq, setLMoq] = useState('1000');
  const [lPrice, setLPrice] = useState('');
  const [lCurrency, setLCurrency] = useState<'USD' | 'ZAR' | 'CNY' | 'EUR'>('USD');
  const [lLocation, setLLocation] = useState('');
  const [lIncoterms, setLIncoterms] = useState('FOB Port Elizabeth, CIF Tianjin');
  const [lSellerRole, setLSellerRole] = useState<SellerDisclosureRole>('producer_owner');
  const [lPrincipalName, setLPrincipalName] = useState('');
  const [lFeeStructure, setLFeeStructure] = useState('');
  const [lHoldsMandate, setLHoldsMandate] = useState(false);
  const [lSpecs, setLSpecs] = useState<Record<string, string>>({});

  // Verification Doc Upload State
  const [docType, setDocType] = useState('company_registration');
  const [docTitle, setDocTitle] = useState('');
  const [docRef, setDocRef] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const [comRes, lstRes] = await Promise.all([
        apiFetch<{commodities: CommodityTemplate[]}>('/commodities'),
        user
          ? apiFetch<{listings: MarketplaceListing[]}>('/listings?mine=true')
          : Promise.resolve({listings: []}),
      ]);
      setCommodities(comRes.commodities);
      setMyListings(lstRes.listings);
    } catch {
      // handled gracefully
    }
  }, [apiFetch, user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'create-listing' || tab === 'verification' || tab === 'listings' || tab === 'overview') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (!user || !business) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center max-w-xl mx-auto">
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
            Business Account Dashboard
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Sign in or register your commercial business to publish supply/demand listings, manage
            verification documents, and track RFQs.
          </p>
          <Link
            to="/auth"
            className="inline-block px-5 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md"
          >
            Sign In / Register Business
          </Link>
        </div>
      </div>
    );
  }

  const selectedCommodity = commodities.find((c) => c.slug === lCommoditySlug);
  const isIntermediary = lSellerRole === 'mandated_intermediary' || lSellerRole === 'broker';

  const handlePublishListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      const res = await apiFetch<{listing: MarketplaceListing}>('/listings', {
        method: 'POST',
        body: JSON.stringify({
          type: lType,
          corridor: lCorridor,
          commoditySlug: lCommoditySlug,
          title: lTitle,
          description: lDesc,
          specifications: lSpecs,
          quantity: Number(lQty),
          unit: selectedCommodity?.defaultUnit || 'MT',
          minOrderQuantity: Number(lMoq) || 1,
          pricePerUnit: lPrice ? Number(lPrice) : null,
          currency: lCurrency,
          originCountry: business.country,
          actualLocation: lLocation || business.city,
          packaging: 'Standard Export Bulk / Containerized',
          incoterms: lIncoterms.split(',').map((s) => s.trim()).filter(Boolean),
          availableDocuments: ['Commercial Spec Sheet'],
          sellerRole: lSellerRole,
          intermediaryDisclosure: {
            isIntermediary,
            principalName: lPrincipalName,
            holdsValidMandate: lHoldsMandate,
            feeStructure: lFeeStructure,
            negotiationAuthority: lHoldsMandate ? 'full_mandate' : 'introduction_only',
          },
        }),
      });
      setMyListings((prev) => [res.listing, ...prev]);
      setLTitle('');
      setLDesc('');
      setActiveTab('listings');
      setSearchParams({tab: 'listings'});
      setFeedback(`Published listing "${res.listing.title}" to the live marketplace.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish listing.');
    }
  };

  const handleToggleStatus = async (listing: MarketplaceListing) => {
    const nextStatus = listing.status === 'active' ? 'paused' : 'active';
    try {
      const res = await apiFetch<{listing: MarketplaceListing}>(`/listings/${listing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({status: nextStatus}),
      });
      setMyListings((prev) => prev.map((l) => (l.id === listing.id ? res.listing : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update listing.');
    }
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      const res = await apiFetch<{business: typeof business}>(`/businesses/${business.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          type: docType,
          title: docTitle,
          referenceNumber: docRef,
        }),
      });
      updateBusiness(res.business);
      setDocTitle('');
      setDocRef('');
      setFeedback('Verification document submitted for compliance review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit document.');
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-slate-800">{user.fullName}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{user.businessRole.replace(/_/g, ' ')}</span>
            <span aria-hidden="true">·</span>
            <VerificationLabel level={business.verificationLevel} compact />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            {business.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg">
          {(
            [
              {id: 'overview', label: 'Overview'},
              {id: 'listings', label: `My Listings (${myListings.length})`},
              {id: 'create-listing', label: '+ New Listing'},
              {id: 'verification', label: 'Verification Docs'},
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setSearchParams({tab: t.id});
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

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

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900 mb-3">
                Commercial Account Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Country &amp; City</span>
                  <span className="font-medium text-slate-900">
                    {business.city}, {business.country}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Registration No.</span>
                  <span className="font-mono text-slate-900">{business.registrationNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Primary Industry</span>
                  <span className="font-medium text-slate-900">{business.industry}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Active Corridors</span>
                  <span className="font-medium text-slate-900">{business.corridors.join(' / ')}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-4 pt-4 border-t border-slate-100">
                {business.verificationSummary}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to="/rfqs"
                className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 transition-colors"
              >
                <p className="text-xs text-slate-500 mb-1">Procurement</p>
                <p className="font-display text-base font-semibold text-slate-900">
                  RFQ Workspace →
                </p>
              </Link>
              <Link
                to="/messages"
                className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 transition-colors"
              >
                <p className="text-xs text-slate-500 mb-1">Negotiations</p>
                <p className="font-display text-base font-semibold text-slate-900">
                  Open Messages →
                </p>
              </Link>
              <Link
                to="/intelligence?tab=calculator"
                className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 transition-colors"
              >
                <p className="text-xs text-slate-500 mb-1">Import Costing</p>
                <p className="font-display text-base font-semibold text-slate-900">
                  Landed Cost Tool →
                </p>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900">Quick Actions</h2>
            <button
              type="button"
              onClick={() => setActiveTab('create-listing')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md"
            >
              <Plus className="w-4 h-4" />
              <span>Publish New Supply / Demand</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('verification')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 rounded-md"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Upload Verification Documents</span>
            </button>
            {user.isTradeDeskStaff && (
              <Link
                to="/trade-desk"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md"
              >
                Open Trade Desk CRM →
              </Link>
            )}
            {user.isPlatformAdmin && (
              <Link
                to="/admin"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium border border-slate-900 text-slate-900 rounded-md"
              >
                Open Admin Console →
              </Link>
            )}
          </div>
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Published Business Listings
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('create-listing')}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md"
            >
              + New Listing
            </button>
          </div>
          {myListings.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-600">
              Your business has not published any listings yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myListings.map((l) => (
                <div
                  key={l.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs text-slate-500 mb-1">
                      <span className="uppercase font-semibold text-slate-800">{l.type}</span> ·{' '}
                      {l.corridor} · Status:{' '}
                      <span className="font-semibold text-amber-700 capitalize">{l.status}</span>
                    </div>
                    <Link
                      to={`/listings/${l.id}`}
                      className="font-display text-base font-semibold text-slate-900 hover:underline inline-flex items-center gap-1.5"
                    >
                      <span>{l.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    <p className="text-xs text-slate-600 font-mono tabular-nums mt-1">
                      {l.quantity.toLocaleString()} {l.unit} ·{' '}
                      {l.pricePerUnit
                        ? `${l.currency} ${l.pricePerUnit.toLocaleString()}/${l.unit}`
                        : 'Price on Request'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(l)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50 self-start sm:self-auto"
                  >
                    {l.status === 'active' ? (
                      <>
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'create-listing' && (
        <form
          onSubmit={handlePublishListing}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
        >
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Structured Supply / Demand Listing Builder
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Listing Mode</label>
              <select
                value={lType}
                onChange={(e) => setLType(e.target.value as ListingType)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              >
                <option value="supply">Supply Offer (Available Stock)</option>
                <option value="demand">Demand Requirement (Seeking to Buy)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Corridor</label>
              <select
                value={lCorridor}
                onChange={(e) => setLCorridor(e.target.value as MarketplaceCorridor)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              >
                <option value="CN-ZA">China ↔ South Africa</option>
                <option value="SA">TerraExchange SA (Domestic)</option>
                <option value="GLOBAL">TerraExchange Global</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Commodity Template
              </label>
              <select
                value={lCommoditySlug}
                onChange={(e) => {
                  setLCommoditySlug(e.target.value);
                  setLSpecs({});
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              >
                {commodities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Listing Title</label>
              <input
                type="text"
                required
                value={lTitle}
                onChange={(e) => setLTitle(e.target.value)}
                placeholder="e.g. 10,000 MT Kalahari Manganese Ore 38% Mn FOB PE"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Actual Stock / Delivery Location
              </label>
              <input
                type="text"
                value={lLocation}
                onChange={(e) => setLLocation(e.target.value)}
                placeholder={business.city}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Commercial Description
            </label>
            <textarea
              rows={2}
              value={lDesc}
              onChange={(e) => setLDesc(e.target.value)}
              placeholder="Detail grade tolerances, loading port schedule, and inspection availability..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Total Quantity ({selectedCommodity?.defaultUnit || 'MT'})
              </label>
              <input
                type="number"
                required
                value={lQty}
                onChange={(e) => setLQty(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">MOQ</label>
              <input
                type="number"
                value={lMoq}
                onChange={(e) => setLMoq(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Indicative Price / Unit (Blank = POR)
              </label>
              <input
                type="number"
                step="any"
                value={lPrice}
                onChange={(e) => setLPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
              <select
                value={lCurrency}
                onChange={(e) =>
                  setLCurrency(e.target.value as 'USD' | 'ZAR' | 'CNY' | 'EUR')
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              >
                <option value="USD">USD</option>
                <option value="ZAR">ZAR</option>
                <option value="CNY">CNY</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Dynamic Commodity Specification Fields */}
          {selectedCommodity && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-800 mb-3">
                {selectedCommodity.name} Technical Specifications
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
                        value={lSpecs[f.key] || ''}
                        onChange={(e) =>
                          setLSpecs((p) => ({...p, [f.key]: e.target.value}))
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
                        value={lSpecs[f.key] || ''}
                        onChange={(e) =>
                          setLSpecs((p) => ({...p, [f.key]: e.target.value}))
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

          {/* Mandatory Seller Role & Intermediary Disclosure */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Declared Commercial Role
                </label>
                <select
                  value={lSellerRole}
                  onChange={(e) => setLSellerRole(e.target.value as SellerDisclosureRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                >
                  <option value="producer_owner">Direct Producer / Mine Owner</option>
                  <option value="manufacturer_exporter">Manufacturer &amp; Exporter</option>
                  <option value="stockist_supplier">Stockist / Direct Supplier</option>
                  <option value="industrial_buyer">Industrial Buyer</option>
                  <option value="mandated_intermediary">Mandated Intermediary</option>
                  <option value="broker">Commercial Broker</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Delivery Incoterms (comma-separated)
                </label>
                <input
                  type="text"
                  value={lIncoterms}
                  onChange={(e) => setLIncoterms(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                />
              </div>
            </div>

            {isIntermediary && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-950">
                  Mandatory Intermediary &amp; Mandate Disclosure
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={lPrincipalName}
                    onChange={(e) => setLPrincipalName(e.target.value)}
                    placeholder="Principal / Owner Entity Represented"
                    className="px-3 py-2 text-xs bg-white border border-amber-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={lFeeStructure}
                    onChange={(e) => setLFeeStructure(e.target.value)}
                    placeholder="Commission / Fee Structure (e.g. USD 3/MT Seller-Side)"
                    className="px-3 py-2 text-xs bg-white border border-amber-300 rounded-md"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-amber-950">
                  <input
                    type="checkbox"
                    checked={lHoldsMandate}
                    onChange={(e) => setLHoldsMandate(e.target.checked)}
                  />
                  <span>I confirm we hold a valid written mandate from the disclosed principal</span>
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md"
          >
            Publish Listing to Marketplace
          </button>
        </form>
      )}

      {activeTab === 'verification' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleDocSubmit}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Submit Compliance &amp; Supply Documentation
            </h2>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              >
                <option value="company_registration">Company Registration (CIPC / PRC)</option>
                <option value="tax_clearance">Tax Clearance Certificate</option>
                <option value="export_import_permit">Export / Import Registration</option>
                <option value="assay_quality_report">SGS / Lab Assay Report</option>
                <option value="origin_certificate">Certificate of Origin</option>
                <option value="facility_evidence">Factory / Silo / Warehouse Evidence</option>
                <option value="agency_mandate">Signed Agency / Broker Mandate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. SARS Tax Compliance Pin 2026"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reference / Certificate Number
              </label>
              <input
                type="text"
                required
                value={docRef}
                onChange={(e) => setDocRef(e.target.value)}
                placeholder="e.g. TCS-2026-89210"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md"
            >
              Submit for Verification Review
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900 mb-4">
              Documents on File ({business.documents.length})
            </h2>
            {business.documents.length === 0 ? (
              <p className="text-sm text-slate-600">No verification documents submitted yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {business.documents.map((d) => (
                  <div key={d.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{d.title}</p>
                      <p className="text-slate-500 font-mono mt-0.5">Ref: {d.referenceNumber}</p>
                    </div>
                    <span
                      className={`capitalize font-semibold ${
                        d.status === 'verified' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
