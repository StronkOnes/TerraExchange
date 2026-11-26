import React, {useState} from 'react';
import {Link, NavLink, useLocation, useNavigate} from 'react-router-dom';
import {Menu, X, ArrowRight} from 'lucide-react';
import {useAuth} from '../context/AuthContext';

export function Layout({children}: {children: React.ReactNode}) {
  const {user, business, corridorFilter, setCorridorFilter, logout} = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';

  const navLinkClass = ({isActive}: {isActive: boolean}) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
      isActive
        ? 'text-slate-900 border-amber-600'
        : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
    }`;

  const subLinkClass = ({isActive}: {isActive: boolean}) =>
    `text-xs font-medium whitespace-nowrap shrink-0 transition-colors px-2.5 py-1.5 rounded-md ${
      isActive
        ? 'bg-slate-900 text-white'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            TerraExchange
          </Link>

          {/* Zone 2: 5 concise single-line text links */}
          <nav className="hidden lg:flex items-center gap-7" aria-label="Primary navigation">
            <NavLink to="/marketplace" className={navLinkClass}>
              Marketplace
            </NavLink>
            <NavLink to="/commodities" className={navLinkClass}>
              Commodities
            </NavLink>
            <NavLink to="/rfqs" className={navLinkClass}>
              RFQs
            </NavLink>
            <NavLink to="/intelligence" className={navLinkClass}>
              Intelligence
            </NavLink>
            <NavLink to="/opportunities" className={navLinkClass}>
              Opportunities
            </NavLink>
          </nav>

          {/* Zone 3: Single primary action */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {user ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 text-slate-700 hover:text-slate-900 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
            <div className="flex flex-col gap-2">
              {[
                {to: '/marketplace', label: 'Marketplace'},
                {to: '/commodities', label: 'Commodities'},
                {to: '/rfqs', label: 'RFQs'},
                {to: '/intelligence', label: 'Trade Intelligence'},
                {to: '/opportunities', label: 'Opportunities & Matching'},
                {to: '/suppliers', label: 'Suppliers Directory'},
                {to: '/buyers', label: 'Buyers Directory'},
                {to: '/messages', label: 'Messages'},
                {to: '/dashboard', label: 'Business Dashboard'},
                {to: '/trade-desk', label: 'Trade Desk CRM'},
                {to: '/admin', label: 'Administration'},
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border-b border-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="pt-2">
              <Link
                to={user ? '/dashboard' : '/auth'}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-md"
              >
                {user ? `Account: ${business?.name || user.fullName}` : 'Sign In / Register Business'}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Secondary Endpoint & Corridor Sub-Bar (outside <header> to keep header clean) */}
      {!isHome && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-[1280px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              <NavLink to="/suppliers" className={subLinkClass}>
                Suppliers
              </NavLink>
              <NavLink to="/buyers" className={subLinkClass}>
                Buyers
              </NavLink>
              <NavLink to="/messages" className={subLinkClass}>
                Messages
              </NavLink>
              <NavLink to="/dashboard" className={subLinkClass}>
                Business Dashboard
              </NavLink>
              <NavLink to="/trade-desk" className={subLinkClass}>
                Trade Desk CRM
              </NavLink>
              <NavLink to="/admin" className={subLinkClass}>
                Admin
              </NavLink>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div
                className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200"
                role="group"
                aria-label="Marketplace corridor selector"
              >
                {(
                  [
                    {id: 'ALL', label: 'All Corridors'},
                    {id: 'SA', label: 'TerraExchange SA'},
                    {id: 'CN-ZA', label: 'China–SA'},
                    {id: 'GLOBAL', label: 'Global'},
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCorridorFilter(c.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      corridorFilter === c.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Quiet Commercial Footer with Direct Endpoint Links */}
      <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 mt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            <div>
              <p className="font-display text-base font-bold text-white mb-2">TerraExchange</p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                International B2B physical commodities and industrial sourcing network connecting
                verified South African, Chinese, and global commercial enterprises.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Marketplaces</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/marketplace?corridor=SA" className="hover:text-white transition-colors">
                    TerraExchange SA
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace?corridor=CN-ZA" className="hover:text-white transition-colors">
                    China–South Africa Corridor
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace?corridor=GLOBAL" className="hover:text-white transition-colors">
                    TerraExchange Global
                  </Link>
                </li>
                <li>
                  <Link to="/commodities" className="hover:text-white transition-colors">
                    Commodity Specification Catalogue
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Procurement & Trade</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/rfqs" className="hover:text-white transition-colors">
                    RFQ & Quotation Workspace
                  </Link>
                </li>
                <li>
                  <Link to="/opportunities" className="hover:text-white transition-colors">
                    Trade Opportunities & Matching
                  </Link>
                </li>
                <li>
                  <Link to="/intelligence" className="hover:text-white transition-colors">
                    Trade Intelligence & Landed Cost
                  </Link>
                </li>
                <li>
                  <Link to="/suppliers" className="hover:text-white transition-colors">
                    Verified Suppliers Directory
                  </Link>
                </li>
                <li>
                  <Link to="/buyers" className="hover:text-white transition-colors">
                    Commercial Buyers Directory
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Operations & Governance</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/dashboard" className="hover:text-white transition-colors">
                    Business Account Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/messages" className="hover:text-white transition-colors">
                    B2B Negotiation Messaging
                  </Link>
                </li>
                <li>
                  <Link to="/trade-desk" className="hover:text-white transition-colors">
                    Internal Trade Desk CRM
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-white transition-colors">
                    Verification & Admin Console
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium pt-1"
                  >
                    <span>Register Commercial Entity</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} TerraExchange. B2B physical trade network — listings and
              quotations do not constitute financial brokerage or guaranteed stock performance.
            </p>
            <p className="tabular-nums">API v1 · SA &amp; Global Infrastructure</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
