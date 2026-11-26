import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import type {
  AuditEvent,
  BusinessAccount,
  ListingStatus,
  MarketplaceListing,
  VerificationLevel,
} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {VerificationLabel} from '../components/VerificationBadge';

interface AdminOverview {
  metrics: {
    totalBusinesses: number;
    activeListings: number;
    openRfqs: number;
    tradeDeskDeals: number;
  };
  businesses: BusinessAccount[];
  listings: MarketplaceListing[];
  auditLogs: AuditEvent[];
}

export function AdminPage() {
  const {apiFetch, user} = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [activeTab, setActiveTab] = useState<'verification' | 'listings' | 'audit'>('verification');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!user?.isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AdminOverview>('/admin/overview');
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin console.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, user]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSetVerification = async (bizId: string, level: VerificationLevel) => {
    try {
      await apiFetch(`/admin/businesses/${bizId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({verificationLevel: level}),
      });
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update verification.');
    }
  };

  const handleModerateListing = async (listingId: string, status: ListingStatus) => {
    try {
      await apiFetch(`/admin/listings/${listingId}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({status}),
      });
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to moderate listing.');
    }
  };

  if (!user?.isPlatformAdmin) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center max-w-xl mx-auto">
          <p className="text-xs font-medium text-amber-700 mb-2">Protected Governance Endpoint</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
            TerraExchange Administration Console
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Business verification approvals, listing moderation, and audit log inspection require
            Platform Administrator permissions.
          </p>
          <Link
            to="/auth"
            className="inline-block px-5 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md"
          >
            Sign In as Platform Administrator
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">
            Platform Governance &amp; KYB Compliance
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Administration Console
          </h1>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
          {(
            [
              {id: 'verification', label: 'Business Verification'},
              {id: 'listings', label: 'Listing Moderation'},
              {id: 'audit', label: 'Audit Logs'},
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs text-slate-500">Registered Businesses</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {data.metrics.totalBusinesses}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs text-slate-500">Active Marketplace Listings</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {data.metrics.activeListings}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs text-slate-500">Open RFQs</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {data.metrics.openRfqs}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs text-slate-500">Trade Desk Deals</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {data.metrics.tradeDeskDeals}
              </p>
            </div>
          </div>

          {activeTab === 'verification' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Business &amp; Registration</th>
                    <th className="py-3 px-4">Country / Corridors</th>
                    <th className="py-3 px-4">Documents</th>
                    <th className="py-3 px-4">Current Verification</th>
                    <th className="py-3 px-4 text-right">Update Level (1–6)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.businesses.map((b) => (
                    <tr key={b.id}>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/businesses/${b.id}`}
                          className="font-semibold text-slate-900 hover:underline block"
                        >
                          {b.name}
                        </Link>
                        <span className="font-mono text-slate-500">Reg: {b.registrationNumber}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {b.country} · {b.corridors.join('/')}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">
                        {b.documents.length} on file
                      </td>
                      <td className="py-3.5 px-4">
                        <VerificationLabel level={b.verificationLevel} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={b.verificationLevel}
                          onChange={(e) =>
                            handleSetVerification(b.id, Number(e.target.value) as VerificationLevel)
                          }
                          aria-label={`Verification level for ${b.name}`}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-medium"
                        >
                          {[1, 2, 3, 4, 5, 6].map((lvl) => (
                            <option key={lvl} value={lvl}>
                              Level {lvl}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Listing</th>
                    <th className="py-3 px-4">Business</th>
                    <th className="py-3 px-4">Type / Corridor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.listings.map((l) => (
                    <tr key={l.id}>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/listings/${l.id}`}
                          className="font-semibold text-slate-900 hover:underline"
                        >
                          {l.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{l.businessName}</td>
                      <td className="py-3.5 px-4 uppercase text-slate-600">
                        {l.type} · {l.corridor}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-semibold text-amber-700">
                        {l.status}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={l.status}
                          onChange={(e) =>
                            handleModerateListing(l.id, e.target.value as ListingStatus)
                          }
                          aria-label={`Moderate ${l.title}`}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md"
                        >
                          <option value="active">Active</option>
                          <option value="pending_review">Pending Review</option>
                          <option value="paused">Paused</option>
                          <option value="fulfilled">Fulfilled</option>
                          <option value="expired">Expired</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              {data.auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-semibold text-slate-900 mr-2">
                      {log.action}
                    </span>
                    <span className="text-slate-700">{log.summary}</span>
                  </div>
                  <div className="text-slate-500 font-mono tabular-nums whitespace-nowrap">
                    {log.actorName} · {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
