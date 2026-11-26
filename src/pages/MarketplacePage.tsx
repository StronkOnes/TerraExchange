import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Search, SlidersHorizontal, ArrowRight, LayoutGrid, List} from 'lucide-react';
import type {CommodityCategory, MarketplaceCorridor, MarketplaceListing} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {ResilientImage} from '../components/ResilientImage';
import {VerificationLabel} from '../components/VerificationBadge';

const CATEGORIES: Array<'ALL' | CommodityCategory> = [
  'ALL',
  'Ferrous Metals',
  'Base Metals',
  'Industrial Minerals',
  'Agricultural Commodities',
  'Machinery & Industrial Equipment',
  'Fertilisers',
];

export function MarketplacePage() {
  const {apiFetch, corridorFilter, setCorridorFilter} = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCorridor =
    (searchParams.get('corridor') as 'ALL' | MarketplaceCorridor) || corridorFilter;

  const [mode, setMode] = useState<'all' | 'supply' | 'demand'>(
    (searchParams.get('mode') as 'all' | 'supply' | 'demand') || 'all'
  );
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'ALL');
  const [commoditySlug, setCommoditySlug] = useState<string>(
    searchParams.get('commodity') || 'ALL'
  );
  const [country, setCountry] = useState<string>('ALL');
  const [minVerification, setMinVerification] = useState<string>('1');
  const [sort, setSort] = useState<string>('recent');
  const [query, setQuery] = useState<string>(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const paramCorridor = searchParams.get('corridor') as 'ALL' | MarketplaceCorridor | null;
    if (paramCorridor && paramCorridor !== corridorFilter) {
      setCorridorFilter(paramCorridor);
    }
  }, [searchParams, corridorFilter, setCorridorFilter]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (corridorFilter !== 'ALL') params.set('corridor', corridorFilter);
    if (mode !== 'all') params.set('type', mode);
    if (category !== 'ALL') params.set('category', category);
    if (commoditySlug !== 'ALL') params.set('commoditySlug', commoditySlug);
    if (country !== 'ALL') params.set('country', country);
    if (minVerification !== '1') params.set('minVerification', minVerification);
    if (sort) params.set('sort', sort);
    if (query.trim()) params.set('q', query.trim());

    apiFetch<{listings: MarketplaceListing[]}>(`/listings?${params.toString()}`)
      .then((res) => {
        if (mounted) setListings(res.listings);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to load listings.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiFetch, corridorFilter, mode, category, commoditySlug, country, minVerification, sort, query]);

  const resetFilters = () => {
    setCorridorFilter('ALL');
    setMode('all');
    setCategory('ALL');
    setCommoditySlug('ALL');
    setCountry('ALL');
    setMinVerification('1');
    setSort('recent');
    setQuery('');
    setSearchParams({});
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">
            {corridorFilter === 'SA'
              ? 'TerraExchange SA Marketplace'
              : corridorFilter === 'CN-ZA'
              ? 'China ↔ South Africa Trade Corridor'
              : corridorFilter === 'GLOBAL'
              ? 'TerraExchange Global Marketplace'
              : 'Integrated SA & Global Marketplace'}
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Physical Commodities &amp; Procurement Listings
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/dashboard?tab=create-listing"
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 whitespace-nowrap"
          >
            Publish Supply or Demand
          </Link>
          <Link
            to="/rfqs?new=1"
            className="px-4 py-2 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            Issue Procurement RFQ
          </Link>
        </div>
      </div>

      {/* Mode Switcher + Search + Sort Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
          {(
            [
              {id: 'all', label: 'All Listings'},
              {id: 'supply', label: 'Supply Offers'},
              {id: 'demand', label: 'Buyer Demand'},
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1 lg:justify-end">
          <div className="relative flex-1 max-w-sm min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by commodity, company, or port..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort listings"
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700"
          >
            <option value="recent">Sort: Recently Listed</option>
            <option value="verification_desc">Sort: Verification Level</option>
            <option value="quantity_desc">Sort: Largest Quantity</option>
            <option value="price_asc">Sort: Lowest Unit Price</option>
          </select>

          <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Card view"
              className={`p-2 ${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              className={`p-2 ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Side Filters + Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter Parameters</span>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-amber-700 hover:underline font-medium"
            >
              Reset
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Marketplace Corridor
            </label>
            <select
              value={corridorFilter}
              onChange={(e) => setCorridorFilter(e.target.value as 'ALL' | MarketplaceCorridor)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="ALL">All Corridors</option>
              <option value="SA">TerraExchange SA (Domestic)</option>
              <option value="CN-ZA">China ↔ South Africa</option>
              <option value="GLOBAL">TerraExchange Global</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Commodity Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Origin / Counterparty Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="ALL">All Countries</option>
              <option value="South Africa">South Africa</option>
              <option value="China">China</option>
              <option value="Zambia">Zambia</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Minimum Verification Level
            </label>
            <select
              value={minVerification}
              onChange={(e) => setMinVerification(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="1">Level 1+ (All Registered)</option>
              <option value="3">Level 3+ (Identity Reviewed)</option>
              <option value="4">Level 4+ (Operational Check)</option>
              <option value="5">Level 5+ (Supply Docs Reviewed)</option>
              <option value="6">Level 6 (Enhanced Verification)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            Listings represent commercial supply or demand declarations. Always verify assay reports
            and mandates before contracting.
          </div>
        </aside>

        <div className="lg:col-span-9">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-4 mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-36 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <p className="font-display text-base font-semibold text-slate-900 mb-2">
                No matching listings found
              </p>
              <p className="text-sm text-slate-600 mb-6">
                Adjust your corridor or category filters, or post an RFQ directly to invited suppliers.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Clear All Filters
                </button>
                <Link
                  to="/rfqs?new=1"
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md"
                >
                  Create Procurement RFQ
                </Link>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between hover:border-slate-400 transition-colors"
                >
                  <div>
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-44 aspect-[4/3] sm:aspect-auto bg-slate-100 shrink-0">
                        <ResilientImage
                          src={item.imageUrl}
                          alt={item.title}
                          fallbackTitle={item.commodityName}
                        />
                      </div>
                      <div className="p-4 flex-1">
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="font-semibold text-slate-800 uppercase">
                            {item.type}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.corridor}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.originCountry}</span>
                          {item.isDemo && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Demo</span>
                            </>
                          )}
                        </div>
                        <Link
                          to={`/listings/${item.id}`}
                          className="font-display text-base font-semibold text-slate-900 hover:text-amber-700 leading-snug block mb-2"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <Link
                            to={`/businesses/${item.businessId}`}
                            className="font-medium text-slate-700 hover:underline truncate max-w-[200px]"
                          >
                            {item.businessName}
                          </Link>
                          <VerificationLabel level={item.verificationLevel} compact />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {item.pricePerUnit
                          ? `${item.currency} ${item.pricePerUnit.toLocaleString()} / ${item.unit}`
                          : 'Price on Request'}
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        Qty: {item.quantity.toLocaleString()} {item.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/rfqs?new=1&listingId=${item.id}`}
                        className="text-xs font-medium text-slate-700 hover:text-slate-900"
                      >
                        Request Quote
                      </Link>
                      <Link
                        to={`/listings/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Type &amp; Listing</th>
                    <th className="py-3 px-4">Counterparty</th>
                    <th className="py-3 px-4">Corridor / Origin</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Indicative Price</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {listings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold uppercase text-slate-700 mr-1.5">
                          {item.type}
                        </span>
                        <Link
                          to={`/listings/${item.id}`}
                          className="font-medium text-slate-900 hover:text-amber-700"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/businesses/${item.businessId}`}
                          className="text-slate-700 hover:underline block"
                        >
                          {item.businessName}
                        </Link>
                        <VerificationLabel level={item.verificationLevel} compact />
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.corridor} · {item.originCountry}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {item.quantity.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {item.pricePerUnit
                          ? `${item.currency} ${item.pricePerUnit.toLocaleString()}`
                          : 'POR'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/listings/${item.id}`}
                          className="font-semibold text-amber-700 hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
