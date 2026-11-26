import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, Layers} from 'lucide-react';
import type {CommodityTemplate} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {ResilientImage} from '../components/ResilientImage';

interface CommodityWithCounts extends CommodityTemplate {
  activeSupplyCount: number;
  activeDemandCount: number;
}

export function CommoditiesPage() {
  const {apiFetch} = useAuth();
  const [commodities, setCommodities] = useState<CommodityWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiFetch<{commodities: CommodityWithCounts[]}>('/commodities')
      .then((res) => {
        if (mounted) setCommodities(res.commodities);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">
            Structured Specification Engine
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            International Commodity Catalogue
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Each commodity template enforces industry-grade chemical, physical, and electrical
            specification parameters across listings and RFQs.
          </p>
        </div>
        <Link
          to="/dashboard?tab=create-listing"
          className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 whitespace-nowrap self-start md:self-auto"
        >
          Publish with Template
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {commodities.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12">
                <div className="sm:col-span-4 aspect-[4/3] sm:aspect-auto bg-slate-100">
                  <ResilientImage
                    src={c.imageUrl}
                    alt={c.name}
                    fallbackTitle={c.name}
                  />
                </div>
                <div className="sm:col-span-8 p-5">
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-1">
                    <span>{c.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">HS {c.hsCodeReference}</span>
                    <span aria-hidden="true">·</span>
                    <span>Unit: {c.defaultUnit}</span>
                  </div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 mb-2">
                    {c.name}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{c.description}</p>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Required &amp; Structured Specification Fields</span>
                    </p>
                    <div className="text-xs text-slate-600 grid grid-cols-2 gap-x-4 gap-y-1">
                      {c.specFields.map((f) => (
                        <div key={f.key} className="truncate">
                          • {f.label}
                          {f.unit ? ` (${f.unit})` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-600 font-mono tabular-nums">
                  {c.activeSupplyCount} supply · {c.activeDemandCount} demand active
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    to={`/rfqs?new=1&commodity=${c.slug}`}
                    className="font-medium text-slate-700 hover:text-slate-900"
                  >
                    Create RFQ
                  </Link>
                  <Link
                    to={`/marketplace?commodity=${c.slug}`}
                    className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800"
                  >
                    <span>Browse Listings</span>
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
