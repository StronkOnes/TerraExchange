import {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {ArrowLeft, CheckCircle2, Globe, MapPin, MessageSquare, FilePlus2} from 'lucide-react';
import type {BusinessAccount, MarketplaceListing} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {VerificationLabel} from '../components/VerificationBadge';

const VERIFICATION_STEPS = [
  {level: 1, label: 'Account Registered'},
  {level: 2, label: 'Business Identity Submitted'},
  {level: 3, label: 'Business Identity Reviewed'},
  {level: 4, label: 'Operational Verification'},
  {level: 5, label: 'Supply / Product Docs Reviewed'},
  {level: 6, label: 'Enhanced Verification'},
];

export function BusinessProfilePage() {
  const {id} = useParams<{id: string}>();
  const {apiFetch} = useAuth();
  const [business, setBusiness] = useState<BusinessAccount | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    apiFetch<{business: BusinessAccount; listings: MarketplaceListing[]}>(`/businesses/${id}`)
      .then((res) => {
        if (!mounted) return;
        setBusiness(res.business);
        setListings(res.listings);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to load business profile.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiFetch, id]);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="h-80 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="font-semibold text-slate-900 mb-2">{error || 'Business not found'}</p>
          <Link to="/suppliers" className="text-sm text-amber-700 hover:underline">
            ← Back to Suppliers Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>{business.industry}</span>
                <span aria-hidden="true">·</span>
                <span>Corridors: {business.corridors.join(' / ')}</span>
              </div>
              <VerificationLabel level={business.verificationLevel} />
            </div>

            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight mb-3">
              {business.name}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 mb-5">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {business.city}, {business.country}
                </span>
              </span>
              {business.website && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{business.website}</span>
                </span>
              )}
            </div>

            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              {business.verificationSummary}
            </p>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Participant Categories</span>
                <span className="font-medium text-slate-900">
                  {business.participantCategories.map((c) => c.replace(/_/g, ' ')).join(', ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Registration Reference</span>
                <span className="font-mono text-slate-900">{business.registrationNumber}</span>
              </div>
            </div>
          </div>

          {/* 6-Level Verification Progression */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900 mb-2">
              Verification Status Breakdown
            </h2>
            <p className="text-xs text-slate-600 mb-5">
              Badges indicate compliance records reviewed by TerraExchange. Verification does not
              guarantee commodity delivery or financial solvency.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {VERIFICATION_STEPS.map((step) => {
                const completed = business.verificationLevel >= step.level;
                return (
                  <div
                    key={step.level}
                    className={`p-3 rounded-md border text-xs flex items-start gap-2 ${
                      completed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        completed ? 'text-emerald-700' : 'text-slate-300'
                      }`}
                    />
                    <div>
                      <p className="font-semibold">Level {step.level}</p>
                      <p>{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Listings by this Business */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900 mb-4">
              Active Marketplace Listings ({listings.length})
            </h2>
            {listings.length === 0 ? (
              <p className="text-sm text-slate-600">No public active listings posted currently.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {listings.map((l) => (
                  <div key={l.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold uppercase text-slate-500 mr-2">
                        {l.type}
                      </span>
                      <Link
                        to={`/listings/${l.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-amber-700"
                      >
                        {l.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                        {l.quantity.toLocaleString()} {l.unit} ·{' '}
                        {l.pricePerUnit
                          ? `${l.currency} ${l.pricePerUnit.toLocaleString()}/${l.unit}`
                          : 'Price on Request'}
                      </p>
                    </div>
                    <Link
                      to={`/listings/${l.id}`}
                      className="text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap shrink-0"
                    >
                      View Listing →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-900 mb-2">
            Engage Counterparty
          </h2>
          <Link
            to={`/messages?toBusinessId=${business.id}`}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send Commercial Enquiry</span>
          </Link>
          <Link
            to={`/rfqs?new=1&inviteBusinessId=${business.id}`}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Invite to New RFQ</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
