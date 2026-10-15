import React, { useState, useEffect } from 'react';
import { Currency, OpenAccountantReport } from '../types';
import {
  Flame,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Calculator,
  Compass,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  currency: Currency;
  fxRate: number;
}

export const FinancialIndependencePanel: React.FC<Props> = ({ currency, fxRate }) => {
  const [report, setReport] = useState<OpenAccountantReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fireMode, setFireMode] = useState<'lean' | 'standard' | 'fat'>('standard');
  const [debtStrategy, setDebtStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraMonthlyContribution, setExtraMonthlyContribution] = useState<number>(0);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8088/api/openaccountant/report');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to load OpenAccountant report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatMoney = (usdVal: number) => {
    const val = currency === 'USD' ? usdVal : usdVal * fxRate;
    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (!report) {
    return (
      <div className="bg-vault-950/90 border border-vault-800 rounded-2xl p-8 text-center backdrop-blur-xl">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Computing Financial Independence Intelligence...</p>
      </div>
    );
  }

  const fi = report.financial_independence;
  const debt = report.debt_payoff;
  const ef = report.emergency_fund;

  // Active FIRE target based on selected mode
  const activeFireTarget =
    fireMode === 'lean'
      ? fi.fire_target_lean_usd
      : fireMode === 'fat'
      ? fi.fire_target_fat_usd
      : fi.fire_target_standard_usd;

  const currentInvested = fi.current_invested_assets_usd;
  const activeProgressPercent = Math.min(
    100,
    parseFloat(((currentInvested / activeFireTarget) * 100).toFixed(1))
  );

  // Dynamic simulation with extra monthly contribution
  const monthlySavingsWithBoost = fi.monthly_savings_usd + extraMonthlyContribution;
  const r = 0.07 / 12; // 7% real compound growth
  let simulatedMonths = 0;
  let simVal = currentInvested;
  while (simVal < activeFireTarget && simulatedMonths < 600) {
    simVal = simVal * (1 + r) + monthlySavingsWithBoost;
    simulatedMonths++;
  }
  const simulatedYears = (simulatedMonths / 12).toFixed(1);

  return (
    <div className="bg-vault-950/90 border border-vault-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-vault-800/80 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Financial Independence (FIRE) Intelligence
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                OpenAccountant Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Safe Withdrawal Rate (4% Rule), Debt Avalanche prioritization & Liquid Runway
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-vault-900 border border-vault-800 rounded-xl p-1 text-xs font-medium">
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setFireMode('lean');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                fireMode === 'lean'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lean FIRE
            </button>
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setFireMode('standard');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                fireMode === 'standard'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Standard FIRE
            </button>
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setFireMode('fat');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                fireMode === 'fat'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fat FIRE
            </button>
          </div>

          <button
            onClick={() => {
              nativeBridge.triggerHaptic('medium');
              fetchReport();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-vault-900 border border-vault-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh OpenAccountant Intelligence"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FIRE Target */}
        <div className="bg-vault-900/70 border border-vault-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>{fireMode.toUpperCase()} FIRE TARGET</span>
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatMoney(activeFireTarget)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            25x annual expenditure ({formatMoney(fi.annual_expenses_usd * (fireMode === 'lean' ? 0.75 : fireMode === 'fat' ? 1.5 : 1.0))}/yr)
          </p>
        </div>

        {/* Funded Progress */}
        <div className="bg-vault-900/70 border border-vault-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>PORTFOLIO FUNDED</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {activeProgressPercent}%
          </div>
          <div className="w-full bg-vault-950 rounded-full h-2 mt-2 overflow-hidden border border-vault-800">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
              style={{ width: `${activeProgressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {formatMoney(currentInvested)} invested base
          </p>
        </div>

        {/* Years to Independence */}
        <div className="bg-vault-900/70 border border-vault-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>YEARS TO FI</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {simulatedYears} <span className="text-sm font-normal text-slate-400">Years</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> At 7% real compound growth
          </p>
        </div>

        {/* Monthly Savings Rate */}
        <div className="bg-vault-900/70 border border-vault-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>SAVINGS RATE</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">
            {fi.savings_rate_percent}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            +{formatMoney(fi.monthly_savings_usd)}/mo from {formatMoney(fi.monthly_net_income_usd)} income
          </p>
        </div>
      </div>

      {/* Main Dual Grid: Debt Payoff Engine & Capital Preservation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Debt Payoff Engine */}
        <div className="bg-vault-900/50 border border-vault-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Debt Payoff Engine (Guaranteed Return)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Total Debt: <span className="text-white font-mono">{formatMoney(debt.total_debt_usd)}</span> | Min Pay: <span className="text-white font-mono">{formatMoney(debt.total_min_monthly_usd)}/mo</span>
                </p>
              </div>
            </div>

            <div className="flex bg-vault-950 border border-vault-800 rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('light');
                  setDebtStrategy('avalanche');
                }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  debtStrategy === 'avalanche'
                    ? 'bg-rose-500/20 text-rose-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Avalanche (High APR)
              </button>
              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('light');
                  setDebtStrategy('snowball');
                }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  debtStrategy === 'snowball'
                    ? 'bg-blue-500/20 text-blue-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Snowball (Balance)
              </button>
            </div>
          </div>

          <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-3 text-xs text-rose-300/90 leading-relaxed">
            💡 <span className="font-semibold text-rose-200">The 21% Return Rule:</span> Paying off Citi ($6,653) and Chase ($3,518) gives an immediate, 100% guaranteed 21.0% return on capital—beating the historical S&P 500 index risk-free.
          </div>

          {/* Ordered Priority List */}
          <div className="space-y-2">
            {(debtStrategy === 'avalanche' ? debt.avalanche_priority : debt.snowball_priority).map(
              (item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-vault-950/60 border border-vault-800/60 hover:border-vault-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-vault-800/80 border border-vault-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-slate-200 max-w-[280px] sm:max-w-xs truncate">
                      {item}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      idx < 3
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}
                  >
                    {idx === 0 ? 'CRITICAL TARGET' : idx < 3 ? 'NEXT' : 'SERVICING'}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Emergency Runway & Liquid Capital Preservation */}
        <div className="bg-vault-900/50 border border-vault-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Capital Preservation & Emergency Runway
                </h3>
                <p className="text-[11px] text-slate-400">
                  Target: 3–6 Months Liquid Reserves
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              {ef.status}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-vault-950/80 border border-vault-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Liquid Cash Reserves</span>
              <div className="text-2xl font-extrabold text-white font-mono mt-0.5">
                {formatMoney(ef.total_liquid_cash_usd)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Survival Runway</span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
                {ef.runway_months} <span className="text-sm font-normal text-slate-400">Months</span>
              </div>
            </div>
          </div>

          {/* Liquid Accounts Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400">Liquid Accounts Composition:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ef.accounts.map((acc, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-vault-950/40 border border-vault-800/60 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-300 truncate max-w-[140px]">{acc.name}</span>
                  <span className="font-mono font-semibold text-white">
                    {formatMoney(acc.usd)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Acceleration Simulator */}
          <div className="pt-2 border-t border-vault-800/60">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span className="flex items-center gap-1 font-semibold">
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                Extra Monthly Investment Boost:
              </span>
              <span className="font-mono text-amber-400 font-bold">
                +{formatMoney(extraMonthlyContribution)}/mo
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={extraMonthlyContribution}
              onChange={(e) => setExtraMonthlyContribution(Number(e.target.value))}
              className="w-full accent-amber-400 bg-vault-800 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>$0</span>
              <span>+$500</span>
              <span>+$1,000</span>
              <span>+$2,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
