import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Search, Building2, ArrowRight, MessageSquare} from 'lucide-react';
import type {BusinessAccount, MarketplaceCorridor} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {VerificationLabel} from '../components/VerificationBadge';

export function BusinessesDirectoryPage({role}: {role: 'buyer' | 'supplier'}) {
  const {apiFetch, corridorFilter} = useAuth();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [country, setCountry] = useState('ALL');
  const [minVerification, setMinVerification] = useState('1');
  const [businesses, setBusinesses] = useState<BusinessAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const params = new URLSearchParams({role});
    if (corridorFilter !== 'ALL') params.set('corridor', corridorFilter);
    if (country !== 'ALL') params.set('country', country);
    if (minVerification !== '1') params.set('minVerification', minVerification);
    if (query.trim()) params.set('q', query.trim());

    apiFetch<{businesses: BusinessAccount[]}>(`/businesses?${params.toString()}`)
      .then((res) => {
        if (mounted) setBusinesses(res.businesses);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiFetch, role, corridorFilter, country, minVerification, query]);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">
            {role === 'supplier' ? 'Producers, Exporters & Stockists' : 'Industrial Buyers & Importers'}
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            {role === 'supplier' ? 'Verified Suppliers Directory' : 'Commercial Buyers Directory'}
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            {role === 'supplier'
              ? 'Mines, agricultural cooperatives, manufacturers, and mandated suppliers active across South Africa and international trade corridors.'
              : 'Smelters, processors, industrial procurement teams, and international importers sourcing physical commodities.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={role === 'supplier' ? '/buyers' : '/suppliers'}
            className="px-4 py-2 text-xs font-medium border border-slate-300 bg-white rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            {role === 'supplier' ? 'Switch to Buyers Directory' : 'Switch to Suppliers Directory'}
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company name, industry, or city..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-md"
        >
          <option value="ALL">All Countries</option>
          <option value="South Africa">South Africa</option>
          <option value="China">China</option>
          <option value="Zambia">Zambia</option>
        </select>
        <select
          value={minVerification}
          onChange={(e) => setMinVerification(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-md"
        >
          <option value="1">All Verification Levels</option>
          <option value="3">Level 3+ Reviewed</option>
          <option value="5">Level 5+ Docs Verified</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <p className="font-semibold text-slate-900 mb-1">No businesses matched those filters</p>
          <p className="text-sm text-slate-600">Try clearing the country or corridor filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {businesses.map((biz) => (
            <div
              key={biz.id}
              className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between hover:border-slate-400 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span>{biz.country}</span>
                    <span aria-hidden="true">·</span>
                    <span>{biz.city}</span>
                    <span aria-hidden="true">·</span>
                    <span>{biz.corridors.join(' / ')}</span>
                  </div>
                  <VerificationLabel level={biz.verificationLevel} compact />
                </div>

                <Link
                  to={`/businesses/${biz.id}`}
                  className="font-display text-lg font-semibold text-slate-900 hover:text-amber-700 flex items-center gap-2 mb-1.5"
                >
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{biz.name}</span>
                </Link>

                <p className="text-xs font-medium text-slate-700 mb-2">{biz.industry}</p>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {biz.verificationSummary}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 truncate max-w-[260px]">
                  Roles: {biz.participantCategories.map((c) => c.replace(/_/g, ' ')).join(' · ')}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to={`/messages?toBusinessId=${biz.id}`}
                    className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Enquire</span>
                  </Link>
                  <Link
                    to={`/businesses/${biz.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800"
                  >
                    <span>Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
