import React, {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ArrowRight, Search, ShieldCheck, Globe, FileCheck2, Scale} from 'lucide-react';
import type {CommodityTemplate, MarketplaceListing} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {ResilientImage} from '../components/ResilientImage';
import {VerificationLabel} from '../components/VerificationBadge';

export function HomePage() {
  const {apiFetch, setCorridorFilter} = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState<'marketplace' | 'suppliers' | 'buyers' | 'rfqs'>('marketplace');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [commodities, setCommodities] = useState<CommodityTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiFetch<{listings: MarketplaceListing[]}>('/listings'),
      apiFetch<{commodities: CommodityTemplate[]}>('/commodities'),
    ])
      .then(([lRes, cRes]) => {
        if (!mounted) return;
        setListings(lRes.listings.slice(0, 4));
        setCommodities(cRes.commodities);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  const handleDiscoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = encodeURIComponent(searchQuery.trim());
    if (searchTarget === 'marketplace') navigate(`/marketplace${q ? `?q=${q}` : ''}`);
    if (searchTarget === 'suppliers') navigate(`/suppliers${q ? `?q=${q}` : ''}`);
    if (searchTarget === 'buyers') navigate(`/buyers${q ? `?q=${q}` : ''}`);
    if (searchTarget === 'rfqs') navigate(`/rfqs${q ? `?q=${q}` : ''}`);
  };

  return (
    <div>
      {/* Hero Section: Single Dominant Focal Visual + Clear Proposition */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0">
          <ResilientImage
            src="/src/assets/images/hero_port_logistics_1795680024354.jpg"
            alt="Deep-water commercial bulk commodity and container shipping port"
            className="w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-amber-400 tracking-wide mb-4">
              South Africa · China–SA Corridor · International Physical Trade
            </p>
            <h1 className="font-display font-bold tracking-tight text-white text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.1] text-balance mb-5">
              Verified commercial sourcing for physical commodities and industrial goods.
            </h1>
            <p className="text-base text-slate-300 leading-relaxed max-w-2xl mb-8">
              TerraExchange connects mines, agricultural cooperatives, manufacturers, industrial buyers,
              and mandated trade intermediaries across South Africa and global corridors through
              structured specifications, KYB verification, and an auditable RFQ workspace.
            </p>

            {/* Primary Action + Secondary Route Links */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/rfqs?new=1"
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Post a Requirement
              </Link>
              <Link
                to="/dashboard?tab=create-listing"
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-200 hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                List Your Supply
              </Link>
            </div>
          </div>

          {/* Integrated Marketplace Discovery Bar */}
          <form
            onSubmit={handleDiscoverySubmit}
            className="mt-12 bg-white rounded-lg p-2 shadow-sm border border-slate-200 max-w-4xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="flex items-center gap-2 px-3 flex-1">
              <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search manganese ore, copper cathodes, maize, crushing equipment, or country..."
                className="w-full py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-2">
              <select
                value={searchTarget}
                onChange={(e) =>
                  setSearchTarget(e.target.value as 'marketplace' | 'suppliers' | 'buyers' | 'rfqs')
                }
                aria-label="Search destination"
                className="text-xs font-medium text-slate-700 bg-slate-100 rounded-md px-3 py-2.5 focus:outline-none"
              >
                <option value="marketplace">Listings</option>
                <option value="suppliers">Suppliers</option>
                <option value="buyers">Buyers</option>
                <option value="rfqs">Open RFQs</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Search Network
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Two Interconnected Experiences + Corridors */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              01. Interconnected Regional &amp; Global Corridors
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
              One shared business identity, verification engine, and RFQ ledger powering both South
              African domestic trade and international cross-border sourcing.
            </p>
          </div>
          <Link
            to="/intelligence"
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>Open Trade Intelligence &amp; Landed Cost</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              corridor: 'CN-ZA' as const,
              title: 'China ↔ South Africa Corridor',
              kicker: 'Strategic Bilateral Hub',
              desc: 'Direct flows between South African manganese, chrome, and agro-exports and Chinese industrial crushing plants, machinery, and chemical inputs.',
              ports: 'Richards Bay / Durban ↔ Tianjin / Qingdao',
            },
            {
              corridor: 'SA' as const,
              title: 'TerraExchange SA Domestic',
              kicker: 'South African Network',
              desc: 'Domestic industrial procurement linking Northern Cape mines, Free State grain silos, and Gauteng ferroalloy smelters and manufacturers.',
              ports: 'Gauteng · Northern Cape · KZN · Western Cape',
            },
            {
              corridor: 'GLOBAL' as const,
              title: 'TerraExchange Global',
              kicker: 'International Sourcing',
              desc: 'Cross-border trade corridors connecting SADC producers with buyers and stockists across Asia, Europe, and the Middle East.',
              ports: 'Durban Bonded · Rotterdam · Shanghai · Jebel Ali',
            },
          ].map((item) => (
            <div
              key={item.corridor}
              className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-amber-700 mb-2">{item.kicker}</p>
                <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{item.desc}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 truncate">{item.ports}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCorridorFilter(item.corridor);
                    navigate(`/marketplace?corridor=${item.corridor}`);
                  }}
                  className="text-xs font-semibold text-slate-900 hover:text-amber-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <span>Enter Corridor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Opportunities / Demonstration Listings */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                02. Active Supply &amp; Demand Listings
              </h2>
              <p className="text-sm text-slate-600 mt-1.5">
                Structured physical commodity parcels and buyer requirements. Demonstration records are
                explicitly marked.
              </p>
            </div>
            <Link
              to="/marketplace"
              className="text-xs font-semibold text-slate-900 hover:text-amber-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>View Full Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((item) => (
                <Link
                  key={item.id}
                  to={`/listings/${item.id}`}
                  className="group bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col hover:border-slate-400 transition-colors"
                >
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    <ResilientImage
                      src={item.imageUrl}
                      alt={item.title}
                      fallbackTitle={item.commodityName}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1.5 truncate">
                        <span className="font-medium text-slate-700 uppercase">
                          {item.type === 'supply' ? 'Supply' : 'Demand'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.corridor}</span>
                        {item.isDemo && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Demo Record</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 leading-snug line-clamp-2 mb-2">
                        {item.title}
                      </h3>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                          {item.pricePerUnit
                            ? `${item.currency} ${item.pricePerUnit.toLocaleString()} / ${item.unit}`
                            : 'Price on Request'}
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {item.quantity.toLocaleString()} {item.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <VerificationLabel level={item.verificationLevel} compact />
                        <span className="text-xs text-slate-500 truncate">{item.originCountry}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Commodity Templates Preview */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              03. Structured Commodity Specification Catalogue
            </h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Every commodity enforces domain-specific technical fields rather than generic listing forms.
            </p>
          </div>
          <Link
            to="/commodities"
            className="text-xs font-semibold text-slate-900 hover:text-amber-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>Browse All Templates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {commodities.slice(0, 6).map((com) => (
            <Link
              key={com.id}
              to={`/marketplace?commodity=${com.slug}`}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <span>{com.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">HS {com.hsCodeReference}</span>
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
                  {com.name}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                  {com.description}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>{com.specFields.length} structured specification fields</span>
                <span className="font-medium text-slate-900">Filter Listings →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Verification & Workflow Trust Section */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium text-amber-400 mb-2">Commercial Transparency</p>
              <h2 className="font-display text-2xl font-bold text-white tracking-tight mb-4">
                Six-tier business verification and role-disclosed trade workflows.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Verification reflects specific documents and operational checks reviewed on file — never
                a blanket guarantee of physical stock or financial performance. Intermediaries and brokers
                are required to disclose principal mandates.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className="px-4 py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
                >
                  Register Your Business
                </Link>
                <Link
                  to="/trade-desk"
                  className="px-4 py-2.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                >
                  Explore Trade Desk CRM
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="border border-slate-800 bg-slate-950/60 rounded-lg p-5">
                <ShieldCheck className="w-5 h-5 text-amber-400 mb-3" aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-white mb-1.5">
                  KYB &amp; Mandate Disclosure
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Distinguishes direct mines, manufacturers, stockists, and mandated intermediaries with
                  audit-logged document review.
                </p>
              </div>
              <div className="border border-slate-800 bg-slate-950/60 rounded-lg p-5">
                <FileCheck2 className="w-5 h-5 text-amber-400 mb-3" aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-white mb-1.5">
                  Side-by-Side RFQ Engine
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Issue technical RFQs, receive confidential supplier quotations, compare Incoterms and
                  lead times, and award contracts.
                </p>
              </div>
              <div className="border border-slate-800 bg-slate-950/60 rounded-lg p-5">
                <Scale className="w-5 h-5 text-amber-400 mb-3" aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-white mb-1.5">
                  Landed Cost &amp; Matching
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Explainable buyer–supplier matching paired with an indicative China-to-SA customs, VAT,
                  and freight landed cost calculator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Directory Strip */}
      <section className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-slate-700 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Direct Access to Dedicated Platform Endpoints
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Navigate directly between Buyers, Suppliers, RFQs, Messaging, Landed Cost Calculator,
                Trade Desk CRM, and Verification Administration.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to="/suppliers"
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Suppliers
            </Link>
            <Link
              to="/buyers"
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Buyers
            </Link>
            <Link
              to="/intelligence?tab=calculator"
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Landed Cost Calculator
            </Link>
            <Link
              to="/admin"
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Admin Console
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
