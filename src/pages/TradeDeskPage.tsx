import React, {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Plus, ArrowRight} from 'lucide-react';
import type {
  CommodityTemplate,
  MarketplaceCorridor,
  TradeDeskDeal,
  TradeDeskStage,
} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';

const STAGES: Array<{id: TradeDeskStage; label: string}> = [
  {id: 'research_lead', label: 'Research Lead'},
  {id: 'contacted', label: 'Contacted'},
  {id: 'qualified', label: 'Qualified'},
  {id: 'requirement_confirmed', label: 'Requirement Confirmed'},
  {id: 'supplier_matching', label: 'Supplier Matching'},
  {id: 'rfq_issued', label: 'RFQ Issued'},
  {id: 'quotation_received', label: 'Quotation Received'},
  {id: 'negotiation', label: 'Negotiation'},
  {id: 'commercial_agreement', label: 'Commercial Agreement'},
  {id: 'completed', label: 'Completed'},
  {id: 'lost', label: 'Lost'},
];

export function TradeDeskPage() {
  const {apiFetch, user} = useAuth();

  const [deals, setDeals] = useState<TradeDeskDeal[]>([]);
  const [commodities, setCommodities] = useState<CommodityTemplate[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [corridor, setCorridor] = useState<MarketplaceCorridor>('CN-ZA');
  const [commoditySlug, setCommoditySlug] = useState('manganese-ore');
  const [buyerName, setBuyerName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [estValue, setEstValue] = useState('450000');
  const [qty, setQty] = useState('2500');
  const [commission, setCommission] = useState('6750');
  const [note, setNote] = useState('');

  const isAuthorized = Boolean(user && (user.isTradeDeskStaff || user.isPlatformAdmin));

  const loadPipeline = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const [tdRes, comRes] = await Promise.all([
        apiFetch<{deals: TradeDeskDeal[]}>('/trade-desk/pipeline'),
        apiFetch<{commodities: CommodityTemplate[]}>('/commodities'),
      ]);
      setDeals(tdRes.deals);
      setCommodities(comRes.commodities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Trade Desk CRM.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAuthorized]);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const com = commodities.find((c) => c.slug === commoditySlug);
      const res = await apiFetch<{deal: TradeDeskDeal}>('/trade-desk/deals', {
        method: 'POST',
        body: JSON.stringify({
          title,
          corridor,
          commoditySlug,
          buyerBusinessName: buyerName,
          supplierBusinessName: supplierName || undefined,
          estimatedValueUsd: Number(estValue),
          quantity: Number(qty),
          unit: com?.defaultUnit || 'MT',
          commissionEstimateUsd: Number(commission),
          lastContactNote: note,
          nextFollowUpDate: '2026-12-08',
        }),
      });
      setDeals((prev) => [res.deal, ...prev]);
      setShowNew(false);
      setTitle('');
      setBuyerName('');
      setSupplierName('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create deal.');
    }
  };

  const handleStageChange = async (dealId: string, stage: TradeDeskStage) => {
    try {
      const res = await apiFetch<{deal: TradeDeskDeal}>(`/trade-desk/deals/${dealId}`, {
        method: 'PATCH',
        body: JSON.stringify({stage}),
      });
      setDeals((prev) => prev.map((d) => (d.id === dealId ? res.deal : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update deal stage.');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center max-w-xl mx-auto">
          <p className="text-xs font-medium text-amber-700 mb-2">Restricted Internal Workspace</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
            TerraExchange Trade Desk CRM
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            The Trade Desk CRM pipeline is restricted to authorised TerraExchange Trade Desk officers
            and platform administrators. Sign in with the Demo Trade Desk / Admin account to inspect
            and manage commercial opportunities.
          </p>
          <Link
            to="/auth"
            className="inline-block px-5 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md"
          >
            Sign In as Trade Desk Officer
          </Link>
        </div>
      </div>
    );
  }

  const totalPipelineUsd = deals
    .filter((d) => d.stage !== 'lost')
    .reduce((acc, d) => acc + d.estimatedValueUsd, 0);
  const totalCommissionUsd = deals
    .filter((d) => d.stage !== 'lost')
    .reduce((acc, d) => acc + d.commissionEstimateUsd, 0);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">
            Internal Commercial Facilitation Desk
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Trade Desk CRM &amp; Deal Pipeline
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Track buyer/supplier research, introductions, RFQ issuance, negotiations, and facilitation
            fees.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{showNew ? 'Close Lead Form' : 'Log Trade Desk Lead'}</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs text-slate-500">Active Pipeline Deals</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {deals.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs text-slate-500">Estimated Gross Trade Value</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            USD {totalPipelineUsd.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs text-slate-500">Projected Facilitation Fees</p>
          <p className="font-mono text-2xl font-bold text-amber-700 tabular-nums mt-1">
            USD {totalCommissionUsd.toLocaleString()}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {showNew && (
        <form
          onSubmit={handleCreateDeal}
          className="bg-white border border-slate-200 rounded-lg p-6 mb-8 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-900">
            Log New Buyer / Supplier Facilitation Opportunity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Opportunity Title"
              className="px-3 py-2 text-sm border border-slate-200 rounded-md"
            />
            <select
              value={corridor}
              onChange={(e) => setCorridor(e.target.value as MarketplaceCorridor)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-md"
            >
              <option value="CN-ZA">China ↔ South Africa</option>
              <option value="SA">TerraExchange SA</option>
              <option value="GLOBAL">TerraExchange Global</option>
            </select>
            <select
              value={commoditySlug}
              onChange={(e) => setCommoditySlug(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-md"
            >
              {commodities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Buyer Company Name"
              className="px-3 py-2 text-sm border border-slate-200 rounded-md"
            />
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Matched Supplier (Optional)"
              className="px-3 py-2 text-sm border border-slate-200 rounded-md"
            />
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Quantity"
              className="px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
            />
            <input
              type="number"
              value={estValue}
              onChange={(e) => setEstValue(e.target.value)}
              placeholder="Value USD"
              className="px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
            />
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="Est Fee USD"
              className="px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contact & procurement requirement notes..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold bg-amber-600 text-white rounded-md"
          >
            Create Pipeline Record
          </button>
        </form>
      )}

      {/* Pipeline Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        {loading ? (
          <div className="h-64 bg-slate-100 animate-pulse" />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-4">Ref &amp; Opportunity</th>
                <th className="py-3 px-4">Buyer ↔ Supplier</th>
                <th className="py-3 px-4 text-right">Est. Value</th>
                <th className="py-3 px-4 text-right">Est. Fee</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4">Follow-Up</th>
                <th className="py-3 px-4 text-right">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 max-w-xs">
                    <span className="font-mono text-slate-500 block">{d.referenceCode}</span>
                    <span className="font-semibold text-slate-900 block">{d.title}</span>
                    <span className="text-slate-500">
                      {d.corridor} · {d.quantity.toLocaleString()} {d.unit}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-900">{d.buyerBusinessName}</p>
                    <p className="text-slate-500">
                      {d.supplierBusinessName || 'Awaiting supplier match'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    USD {d.estimatedValueUsd.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-800 tabular-nums whitespace-nowrap">
                    USD {d.commissionEstimateUsd.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={d.stage}
                      onChange={(e) => handleStageChange(d.id, e.target.value as TradeDeskStage)}
                      aria-label={`Stage for ${d.referenceCode}`}
                      className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-medium"
                    >
                      {STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <span className="font-mono text-slate-500 block">{d.nextFollowUpDate}</span>
                    <span className="text-slate-600 line-clamp-2">{d.lastContactNote}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      to={`/rfqs?new=1&commodity=${d.commoditySlug}`}
                      className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
                    >
                      <span>Issue RFQ</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
