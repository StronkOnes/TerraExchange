import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, Sparkles} from 'lucide-react';
import type {
  CommodityTemplate,
  MatchRecommendation,
  TradeOpportunity,
} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {VerificationLabel} from '../components/VerificationBadge';

export function OpportunitiesPage() {
  const {apiFetch, corridorFilter} = useAuth();

  const [opportunities, setOpportunities] = useState<TradeOpportunity[]>([]);
  const [commodities, setCommodities] = useState<CommodityTemplate[]>([]);
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);

  const [matchCommodity, setMatchCommodity] = useState('manganese-ore');
  const [matchQuantity, setMatchQuantity] = useState('5000');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const params = corridorFilter !== 'ALL' ? `?corridor=${corridorFilter}` : '';
    Promise.all([
      apiFetch<{opportunities: TradeOpportunity[]}>(`/opportunities${params}`),
      apiFetch<{commodities: CommodityTemplate[]}>('/commodities'),
    ])
      .then(([oppRes, comRes]) => {
        if (!mounted) return;
        setOpportunities(oppRes.opportunities);
        setCommodities(comRes.commodities);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiFetch, corridorFilter]);

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams({commoditySlug: matchCommodity});
    if (corridorFilter !== 'ALL') params.set('corridor', corridorFilter);
    if (matchQuantity) params.set('minQuantity', matchQuantity);

    apiFetch<{matches: MatchRecommendation[]}>(`/matches?${params.toString()}`)
      .then((res) => {
        if (mounted) setMatches(res.matches);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [apiFetch, matchCommodity, matchQuantity, corridorFilter]);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10 space-y-12">
      <div className="pb-6 border-b border-slate-200">
        <p className="text-xs font-medium text-amber-700 mb-1">
          Corridor Facilitation &amp; Compatibility Engine
        </p>
        <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
          Trade Opportunities &amp; Supplier Matching
        </h1>
        <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
          Discover structured offtake contracts, China–South Africa sourcing mandates, and explainable
          supplier matches ranked by specification, capacity, corridor, and verification level.
        </p>
      </div>

      {/* Section 1: Curated Commercial Opportunities */}
      <section>
        <h2 className="font-display text-xl font-semibold text-slate-900 mb-5">
          01. Active Corridor Trade Opportunities
        </h2>
        {loading ? (
          <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                    <span className="font-semibold text-amber-700">{opp.corridor}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{opp.opportunityType.replace(/_/g, ' ')}</span>
                    {opp.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Demo</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
                    {opp.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{opp.summary}</p>
                  <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3 mb-4">
                    <p>
                      <span className="text-slate-500">Route:</span> {opp.origin} → {opp.destination}
                    </p>
                    <p className="font-mono tabular-nums">
                      <span className="text-slate-500 font-sans">Volume:</span> {opp.volumeSummary}
                    </p>
                    <p className="font-mono tabular-nums">
                      <span className="text-slate-500 font-sans">Indicative Scale:</span>{' '}
                      {opp.indicativeValueSummary}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <VerificationLabel level={opp.verificationLevel} compact />
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/rfqs?new=1&commodity=${opp.commoditySlug}&inviteBusinessId=${opp.leadBusinessId}`}
                      className="text-xs font-semibold text-amber-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Respond / RFQ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Explainable Buyer-Supplier Matching Engine */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>02. Buyer–Supplier Compatibility Matcher</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Matches supply capacity, corridor logistics, producer disclosure, and verification tier —
              showing exact reasons for every recommendation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={matchCommodity}
              onChange={(e) => setMatchCommodity(e.target.value)}
              aria-label="Select commodity to match"
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md"
            >
              {commodities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={matchQuantity}
              onChange={(e) => setMatchQuantity(e.target.value)}
              placeholder="Required Qty"
              aria-label="Required quantity"
              className="w-36 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm text-slate-600 py-6 text-center">
            No active supply offers matched this commodity and corridor combination. Try switching the
            corridor selector to All Corridors.
          </p>
        ) : (
          <div className="space-y-4">
            {matches.map((m) => (
              <div
                key={m.id}
                className="border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      Compatibility {m.score}%
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{m.corridor}</span>
                    <span aria-hidden="true">·</span>
                    <span>{m.supplierCountry}</span>
                    <span aria-hidden="true">·</span>
                    <VerificationLabel level={m.supplierVerificationLevel} compact />
                  </div>
                  <Link
                    to={`/listings/${m.supplyListingId}`}
                    className="font-display text-base font-semibold text-slate-900 hover:text-amber-700 block"
                  >
                    {m.supplyTitle}
                  </Link>
                  <p className="text-xs text-slate-600">
                    Supplier:{' '}
                    <Link
                      to={`/businesses/${m.supplierBusinessId}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {m.supplierName}
                    </Link>
                  </p>
                  <div className="pt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                    {m.reasons.map((r) => (
                      <span key={r}>✓ {r}</span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {m.pricePerUnit
                      ? `${m.currency} ${m.pricePerUnit.toLocaleString()} / ${m.unit}`
                      : 'Price on Request'}
                  </div>
                  <div className="font-mono text-xs text-slate-500 tabular-nums">
                    Avail: {m.quantityAvailable.toLocaleString()} {m.unit}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/rfqs?new=1&listingId=${m.supplyListingId}&inviteBusinessId=${m.supplierBusinessId}`}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md"
                    >
                      Issue RFQ
                    </Link>
                    <Link
                      to={`/listings/${m.supplyListingId}`}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
