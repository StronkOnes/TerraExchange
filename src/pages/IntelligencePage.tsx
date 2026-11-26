import React, {useCallback, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Calculator, AlertTriangle, TrendingUp, ShieldAlert} from 'lucide-react';
import type {
  LandedCostBreakdown,
  LandedCostInput,
  TradeIntelligencePayload,
} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';

export function IntelligencePage() {
  const {apiFetch} = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') === 'calculator' ? 'calculator' : 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'calculator'>(initialTab);
  const [intel, setIntel] = useState<TradeIntelligencePayload | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(true);

  const [calcInput, setCalcInput] = useState<LandedCostInput>({
    corridor: 'CN-ZA',
    commodityName: searchParams.get('commodity') || 'Industrial Crushing Equipment / Steel Goods',
    hsCode: '8474.20',
    quantity: Number(searchParams.get('qty')) || 1,
    unit: searchParams.get('unit') || 'Unit',
    unitSupplierPrice: Number(searchParams.get('price')) || 214500,
    supplierCurrency: 'USD',
    exchangeRateToZar: 18.2,
    incotermBase: 'FOB',
    oceanFreightTotalUsd: 6800,
    marineInsurancePct: 0.35,
    customsDutyPct: 0,
    importVatPct: 15,
    portHandlingZar: 24500,
    customsClearanceZar: 9500,
    inlandHaulageZar: 42000,
    otherFeesZar: 6500,
  });
  const [breakdown, setBreakdown] = useState<LandedCostBreakdown | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'calculator' || tabParam === 'overview') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    apiFetch<TradeIntelligencePayload>('/intelligence')
      .then((res) => {
        if (mounted) setIntel(res);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingIntel(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  const runCalculation = useCallback(
    async (payload: LandedCostInput) => {
      setCalcError(null);
      try {
        const res = await apiFetch<{breakdown: LandedCostBreakdown}>('/landed-cost/calculate', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setBreakdown(res.breakdown);
      } catch (err) {
        setCalcError(err instanceof Error ? err.message : 'Unable to calculate landed cost.');
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    runCalculation(calcInput);
  }, []); // initial estimate on mount

  const handleCalculateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCalculation(calcInput);
  };

  const switchTab = (tab: 'overview' | 'calculator') => {
    setActiveTab(tab);
    setSearchParams({tab});
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">
            Market Transparency &amp; Import Cost Modelling
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Trade Intelligence &amp; Landed Cost Calculator
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Platform corridor activity, indicative price benchmarks clearly separated from verified
            data, regulatory compliance notices, and configurable China-to-SA import landed cost
            modelling.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
          <button
            type="button"
            onClick={() => switchTab('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Market Intelligence
          </button>
          <button
            type="button"
            onClick={() => switchTab('calculator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Landed Cost Calculator
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        loadingIntel || !intel ? (
          <div className="h-72 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <div className="space-y-10">
            {/* Corridor Activity */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>01. Active Corridor Indicators</span>
                </h2>
                <button
                  type="button"
                  onClick={() => switchTab('calculator')}
                  className="text-xs font-semibold text-amber-700 hover:underline"
                >
                  Open Landed Cost Calculator →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {intel.corridorMetrics.map((m) => (
                  <div
                    key={m.corridor}
                    className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
                  >
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        Source: {m.dataClassification}
                      </p>
                      <h3 className="font-display text-base font-semibold text-slate-900">
                        {m.label}
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                      <div>
                        <span className="font-mono text-lg font-bold text-slate-900 tabular-nums block">
                          {m.activeSupplyCount}
                        </span>
                        <span className="text-[11px] text-slate-500">Supply</span>
                      </div>
                      <div>
                        <span className="font-mono text-lg font-bold text-slate-900 tabular-nums block">
                          {m.activeDemandCount}
                        </span>
                        <span className="text-[11px] text-slate-500">Demand</span>
                      </div>
                      <div>
                        <span className="font-mono text-lg font-bold text-slate-900 tabular-nums block">
                          {m.openRfqCount}
                        </span>
                        <span className="text-[11px] text-slate-500">Open RFQs</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{m.notes}</p>
                    <div className="text-xs text-slate-500 pt-1">
                      <span className="font-medium text-slate-700">Primary Hubs:</span>{' '}
                      {m.primaryPorts}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Indicative Benchmarks */}
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="font-display text-xl font-semibold text-slate-900 mb-1.5">
                02. Commodity Reference Ranges (Indicative &amp; User-Submitted)
              </h2>
              <p className="text-xs text-slate-600 mb-5">
                TerraExchange explicitly distinguishes user-submitted listing averages and indicative
                estimates from contracted execution prices. Do not treat indicative ranges as
                exchange settlement prices.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Commodity</th>
                      <th className="py-3 px-4">Indicative Range</th>
                      <th className="py-3 px-4">Typical Incoterm</th>
                      <th className="py-3 px-4">Corridor Context</th>
                      <th className="py-3 px-4">Data Classification</th>
                      <th className="py-3 px-4 text-right">Marketplace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {intel.commodityBenchmarks.map((b) => (
                      <tr key={b.commoditySlug}>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {b.commodityName}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {b.referenceRange} / {b.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{b.typicalIncoterm}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">{b.corridorTrend}</td>
                        <td className="py-3 px-4 font-medium text-amber-800 whitespace-nowrap">
                          {b.dataClassification}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link
                            to={`/marketplace?commodity=${b.commoditySlug}`}
                            className="font-semibold text-slate-900 hover:text-amber-700"
                          >
                            View Listings →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Regulatory & Compliance Notices */}
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>03. Cross-Border Permits &amp; Regulatory Restrictions</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {intel.complianceNotices.map((n) => (
                  <div key={n.id} className="border border-slate-200 rounded-md p-4 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-900 mb-1">{n.jurisdiction}</p>
                    <p className="text-xs font-medium text-amber-800 mb-2">{n.commodityGroup}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.requirement}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )
      ) : (
        /* Landed Cost Calculator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleCalculateSubmit}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-6"
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Configurable Landed Cost Assumptions (China → South Africa &amp; Global)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Corridor</label>
                <select
                  value={calcInput.corridor}
                  onChange={(e) =>
                    setCalcInput((p) => ({
                      ...p,
                      corridor: e.target.value as LandedCostInput['corridor'],
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                >
                  <option value="CN-ZA">China Import → South Africa</option>
                  <option value="GLOBAL-ZA">Global Import → South Africa</option>
                  <option value="ZA-EXPORT">South Africa Export (FOB/CIF)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Commodity / Goods Description
                </label>
                <input
                  type="text"
                  value={calcInput.commodityName}
                  onChange={(e) => setCalcInput((p) => ({...p, commodityName: e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reference HS Code
                </label>
                <input
                  type="text"
                  value={calcInput.hsCode}
                  onChange={(e) => setCalcInput((p) => ({...p, hsCode: e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={calcInput.quantity}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, quantity: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={calcInput.unit}
                  onChange={(e) => setCalcInput((p) => ({...p, unit: e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supplier Base Term
                </label>
                <select
                  value={calcInput.incotermBase}
                  onChange={(e) =>
                    setCalcInput((p) => ({
                      ...p,
                      incotermBase: e.target.value as LandedCostInput['incotermBase'],
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                >
                  <option value="FOB">FOB Origin Port</option>
                  <option value="EXW">EXW Factory</option>
                  <option value="CIF">CIF Destination Port</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supplier Unit Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={calcInput.unitSupplierPrice}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, unitSupplierPrice: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
                <select
                  value={calcInput.supplierCurrency}
                  onChange={(e) =>
                    setCalcInput((p) => ({
                      ...p,
                      supplierCurrency: e.target.value as LandedCostInput['supplierCurrency'],
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                >
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                  <option value="EUR">EUR</option>
                  <option value="ZAR">ZAR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  FX Rate to ZAR
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={calcInput.exchangeRateToZar}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, exchangeRateToZar: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ocean Freight (USD)
                </label>
                <input
                  type="number"
                  value={calcInput.oceanFreightTotalUsd}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, oceanFreightTotalUsd: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Insurance (%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={calcInput.marineInsurancePct}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, marineInsurancePct: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Customs Duty (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={calcInput.customsDutyPct}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, customsDutyPct: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Import VAT (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={calcInput.importVatPct}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, importVatPct: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Port Handling (ZAR)
                </label>
                <input
                  type="number"
                  value={calcInput.portHandlingZar}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, portHandlingZar: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Clearance (ZAR)
                </label>
                <input
                  type="number"
                  value={calcInput.customsClearanceZar}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, customsClearanceZar: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Inland Haulage (ZAR)
                </label>
                <input
                  type="number"
                  value={calcInput.inlandHaulageZar}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, inlandHaulageZar: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Other Fees (ZAR)
                </label>
                <input
                  type="number"
                  value={calcInput.otherFeesZar}
                  onChange={(e) =>
                    setCalcInput((p) => ({...p, otherFeesZar: Number(e.target.value)}))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md"
            >
              Recalculate Landed Cost Estimate
            </button>
          </form>

          {/* Breakdown Panel */}
          <div className="lg:col-span-5 space-y-6">
            {calcError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-4">
                {calcError}
              </div>
            )}

            {breakdown && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">
                    Indicative Landed Cost Breakdown
                  </p>
                  <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    ZAR {breakdown.totalLandedCostZar.toLocaleString()}
                  </p>
                  <p className="font-mono text-xs text-slate-600 tabular-nums mt-1">
                    ZAR {breakdown.landedCostPerUnitZar.toLocaleString()} / {breakdown.input.unit} (≈
                    USD {breakdown.landedCostPerUnitUsd.toLocaleString()})
                  </p>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {[
                    ['Goods Value (Converted)', breakdown.goodsValueZar],
                    ['Ocean Freight', breakdown.freightZar],
                    ['Marine Insurance', breakdown.insuranceZar],
                    ['CIF Customs Value', breakdown.cifCustomsValueZar],
                    [`Customs Duty (${breakdown.input.customsDutyPct}%)`, breakdown.customsDutyZar],
                    ['SARS Added Tax Value (ATV)', breakdown.addedTaxValueAtvZar],
                    [`Import VAT (${breakdown.input.importVatPct}%)`, breakdown.importVatZar],
                    ['Port Handling & Clearance', breakdown.portAndClearanceZar],
                    ['Inland Haulage & Other', breakdown.inlandAndOtherZar],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-mono font-medium text-slate-900 tabular-nums">
                        ZAR {Number(val).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-xs text-amber-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{breakdown.disclaimer}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
