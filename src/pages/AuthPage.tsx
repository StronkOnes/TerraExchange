import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ShieldCheck, ArrowRight} from 'lucide-react';
import type {
  BusinessAccount,
  BusinessRole,
  MarketplaceCorridor,
  ParticipantCategory,
  UserAccount,
} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';
import {VerificationLabel} from '../components/VerificationBadge';

interface DemoAccountSummary {
  id: string;
  fullName: string;
  email: string;
  businessRole: string;
  businessName: string;
  country: string;
  verificationLevel: 1 | 2 | 3 | 4 | 5 | 6;
  isPlatformAdmin: boolean;
  isTradeDeskStaff: boolean;
}

export function AuthPage() {
  const {apiFetch, setSession} = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('South Africa');
  const [city, setCity] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('Mining & Mineral Production');
  const [businessRole, setBusinessRole] = useState<BusinessRole>('procurement_manager');
  const [categories, setCategories] = useState<ParticipantCategory[]>(['industrial_buyer']);
  const [corridors, setCorridors] = useState<MarketplaceCorridor[]>(['SA', 'CN-ZA']);

  useEffect(() => {
    apiFetch<{accounts: DemoAccountSummary[]}>('/auth/demo-accounts')
      .then((res) => setDemoAccounts(res.accounts))
      .catch(() => {});
  }, [apiFetch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        token: string;
        user: UserAccount;
        business: BusinessAccount;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({email: loginEmail, password: loginPassword}),
      });
      setSession(res.token, res.user, res.business);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (userId: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        token: string;
        user: UserAccount;
        business: BusinessAccount;
      }>('/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({userId}),
      });
      setSession(res.token, res.user, res.business);
      navigate(res.user.isPlatformAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        token: string;
        user: UserAccount;
        business: BusinessAccount;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          country,
          city,
          businessName,
          registrationNumber: regNumber,
          website,
          industry,
          businessRole,
          participantCategories: categories,
          corridors,
        }),
      });
      setSession(res.token, res.user, res.business);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (cat: ParticipantCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleCorridor = (cor: MarketplaceCorridor) => {
    setCorridors((prev) =>
      prev.includes(cor) ? prev.filter((c) => c !== cor) : [...prev, cor]
    );
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Auth Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-8">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-6">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Register Commercial Business
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-md p-3 mb-5">
              {error}
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Sign In to TerraExchange
              </h1>
              <p className="text-xs text-slate-600">
                Access your business procurement workspace, quotations, and commercial messaging.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.co.za"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md"
              >
                {submitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Register Commercial Business Account
              </h1>
              <p className="text-xs text-slate-600">
                Create an authorised business entity with role-based permissions across South African
                and international trade corridors.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Business Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telephone (Intl Format)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 11 ..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Registered Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company Registration No.
                  </label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g. 2021/123456/07"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Johannesburg / Qingdao"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Business Role
                  </label>
                  <select
                    value={businessRole}
                    onChange={(e) => setBusinessRole(e.target.value as BusinessRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  >
                    <option value="business_owner">Business Owner</option>
                    <option value="procurement_manager">Procurement Manager</option>
                    <option value="trading_manager">Trading Manager</option>
                    <option value="sales_representative">Sales Representative</option>
                    <option value="operations_manager">Operations Manager</option>
                    <option value="finance_officer">Finance Officer</option>
                    <option value="administrator">Account Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Industry / Website
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-700 mb-2">
                  Commercial Participant Categories (Select all that apply)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      ['mine_producer', 'Mine / Mineral Producer'],
                      ['agricultural_producer', 'Agricultural Producer'],
                      ['manufacturer_exporter', 'Manufacturer & Exporter'],
                      ['commodity_supplier', 'Commodity Stockist'],
                      ['industrial_buyer', 'Industrial Buyer'],
                      ['importer_wholesaler', 'Importer & Wholesaler'],
                      ['processor_smelter', 'Processor / Smelter'],
                      ['trader_broker', 'Trader / Broker'],
                      ['logistics_provider', 'Logistics / Shipping'],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className="inline-flex items-center gap-1.5 text-slate-700">
                      <input
                        type="checkbox"
                        checked={categories.includes(id)}
                        onChange={() => toggleCategory(id)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-700 mb-2">Active Trade Corridors</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  {(
                    [
                      ['SA', 'TerraExchange SA'],
                      ['CN-ZA', 'China–South Africa'],
                      ['GLOBAL', 'TerraExchange Global'],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className="inline-flex items-center gap-1.5 text-slate-700">
                      <input
                        type="checkbox"
                        checked={corridors.includes(id)}
                        onChange={() => toggleCorridor(id)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md"
              >
                {submitting ? 'Creating Business Account...' : 'Create Business Account'}
              </button>
            </form>
          )}
        </div>

        {/* Right: Clearly Labeled Demo Workspace Accounts */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Demonstration Workspace Accounts
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Use these clearly labelled demonstration commercial entities to evaluate buyer,
            supplier, China–SA cross-border, Trade Desk CRM, and Administration endpoints.
          </p>

          <div className="space-y-3">
            {demoAccounts.map((acc) => (
              <div
                key={acc.id}
                className="border border-slate-200 rounded-md p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{acc.businessName}</span>
                  <VerificationLabel level={acc.verificationLevel} compact />
                </div>
                <div className="text-xs text-slate-600">
                  {acc.fullName} ·{' '}
                  <span className="capitalize">{acc.businessRole.replace(/_/g, ' ')}</span> ·{' '}
                  {acc.country}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-[11px] text-slate-500 truncate max-w-[200px]">
                    {acc.email}
                  </span>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDemoLogin(acc.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md whitespace-nowrap"
                  >
                    <span>Enter Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
