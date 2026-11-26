import {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {ArrowLeft, FileText, MessageSquare, Calculator, FilePlus2, AlertTriangle} from 'lucide-react';
import type {
  BusinessAccount,
  CommodityTemplate,
  MarketplaceListing,
  MatchRecommendation,
} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {ResilientImage} from '../components/ResilientImage';
import {VerificationLabel} from '../components/VerificationBadge';

export function ListingDetailPage() {
  const {id} = useParams<{id: string}>();
  const {apiFetch} = useAuth();

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [commodity, setCommodity] = useState<CommodityTemplate | null>(null);
  const [business, setBusiness] = useState<BusinessAccount | null>(null);
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    apiFetch<{
      listing: MarketplaceListing;
      commodity?: CommodityTemplate;
      business?: BusinessAccount;
      recommendedSuppliers?: MatchRecommendation[];
    }>(`/listings/${id}`)
      .then((res) => {
        if (!mounted) return;
        setListing(res.listing);
        setCommodity(res.commodity || null);
        setBusiness(res.business || null);
        setMatches(res.recommendedSuppliers || []);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to load listing.');
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
        <div className="h-96 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-base font-semibold text-slate-900 mb-2">
            {error || 'Listing not found'}
          </p>
          <Link to="/marketplace" className="text-sm font-medium text-amber-700 hover:underline">
            ← Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const specLabelMap = new Map(commodity?.specFields.map((f) => [f.key, f]) || []);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Main Detail */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-5 aspect-[4/3] md:aspect-auto bg-slate-100">
                <ResilientImage
                  src={listing.imageUrl}
                  alt={listing.title}
                  fallbackTitle={listing.commodityName}
                />
              </div>
              <div className="md:col-span-7 p-6 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="font-semibold text-slate-900 uppercase">
                      {listing.type === 'supply' ? 'Supply Offer' : 'Buyer Demand'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{listing.corridor}</span>
                    <span aria-hidden="true">·</span>
                    <span>{listing.category}</span>
                    {listing.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Demonstration Listing</span>
                      </>
                    )}
                  </div>
                  <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight mb-3">
                    {listing.title}
                  </h1>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {listing.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Indicative Price</p>
                    <p className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-0.5">
                      {listing.pricePerUnit
                        ? `${listing.currency} ${listing.pricePerUnit.toLocaleString()} / ${listing.unit}`
                        : 'Price on Request'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Volume</p>
                    <p className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-0.5">
                      {listing.quantity.toLocaleString()} {listing.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Minimum Order</p>
                    <p className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-0.5">
                      {listing.minOrderQuantity.toLocaleString()} {listing.unit}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Structured Commodity Specifications */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900 mb-4">
              Technical &amp; Commercial Specifications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {Object.entries(listing.specifications).map(([key, val]) => {
                const def = specLabelMap.get(key);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b border-slate-100"
                  >
                    <span className="text-slate-600">{def?.label || key}</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {val}
                      {def?.unit ? ` ${def.unit}` : ''}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Origin Country</span>
                <span className="font-medium text-slate-900">{listing.originCountry}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Actual Stock / Delivery Location</span>
                <span className="font-medium text-slate-900 text-right">{listing.actualLocation}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Packaging</span>
                <span className="font-medium text-slate-900 text-right">{listing.packaging}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Delivery Terms (Incoterms)</span>
                <span className="font-medium text-slate-900 text-right">
                  {listing.incoterms.join(' / ')}
                </span>
              </div>
            </div>
          </div>

          {/* Intermediary & Role Disclosure */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900 mb-3">
              Counterparty Role &amp; Compliance Documentation
            </h2>
            <div className="text-sm text-slate-700 space-y-2 mb-4">
              <p>
                <span className="font-medium text-slate-900">Declared Role:</span>{' '}
                {listing.sellerRole.replace(/_/g, ' ')}
              </p>
              {listing.intermediaryDisclosure.isIntermediary && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-xs text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Intermediary / Mandate Disclosure</span>
                  </div>
                  <p>Principal: {listing.intermediaryDisclosure.principalName}</p>
                  <p>
                    Mandate Verified:{' '}
                    {listing.intermediaryDisclosure.holdsValidMandate ? 'Yes (Mandate on file)' : 'Pending'}
                  </p>
                  {listing.intermediaryDisclosure.feeStructure && (
                    <p>Fee Structure: {listing.intermediaryDisclosure.feeStructure}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Declared Available Documentation
              </p>
              <div className="flex flex-wrap gap-3">
                {listing.availableDocuments.map((doc) => (
                  <div
                    key={doc}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Matching Suppliers for Demand Listings */}
          {listing.type === 'demand' && matches.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900 mb-4">
                Recommended Matching Supply Offers
              </h2>
              <div className="space-y-4">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        Match Compatibility {m.score}% · {m.supplierCountry}
                      </div>
                      <Link
                        to={`/listings/${m.supplyListingId}`}
                        className="font-semibold text-sm text-slate-900 hover:text-amber-700"
                      >
                        {m.supplyTitle}
                      </Link>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        {m.reasons.map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                    <Link
                      to={`/listings/${m.supplyListingId}`}
                      className="px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md whitespace-nowrap shrink-0"
                    >
                      Inspect Supply
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Column: 1-Click Connected Endpoints */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Commercial Actions
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Move directly from this listing to formal quotation procurement, B2B messaging, or landed
              cost estimation.
            </p>

            <div className="space-y-2.5">
              <Link
                to={`/rfqs?new=1&listingId=${listing.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Issue RFQ for This Commodity</span>
              </Link>
              <Link
                to={`/messages?toBusinessId=${listing.businessId}&listingId=${listing.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Counterparty</span>
              </Link>
              <Link
                to={`/intelligence?tab=calculator&commodity=${encodeURIComponent(
                  listing.commodityName
                )}&price=${listing.pricePerUnit || 200}&qty=${listing.minOrderQuantity}&unit=${encodeURIComponent(
                  listing.unit
                )}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-md transition-colors"
              >
                <Calculator className="w-4 h-4" />
                <span>Estimate SA Landed Cost</span>
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-xs font-medium text-slate-500 mb-1">Published By</p>
            <Link
              to={`/businesses/${listing.businessId}`}
              className="font-display text-base font-semibold text-slate-900 hover:text-amber-700 block mb-2"
            >
              {listing.businessName}
            </Link>
            <div className="mb-3">
              <VerificationLabel level={listing.verificationLevel} />
            </div>
            {business && (
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {business.verificationSummary}
              </p>
            )}
            <Link
              to={`/businesses/${listing.businessId}`}
              className="text-xs font-semibold text-slate-900 hover:text-amber-700"
            >
              View Full Business Profile →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
