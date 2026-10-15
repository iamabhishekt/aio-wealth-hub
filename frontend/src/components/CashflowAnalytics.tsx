import React, { useState } from 'react';
import { Currency, ForecastResult } from '../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  forecast: ForecastResult;
  currency: Currency;
  fxRate: number;
}

export const CashflowAnalytics: React.FC<Props> = ({ forecast, currency, fxRate }) => {
  const [timeHorizon, setTimeHorizon] = useState<'month' | 'quarter' | 'year'>('month');

  const multiplier = timeHorizon === 'month' ? 1 : timeHorizon === 'quarter' ? 3 : 12;

  const inflowUsd = forecast.monthly_inflow_usd * multiplier;
  const outflowUsd = forecast.monthly_burn_usd * multiplier;
  const surplusUsd = forecast.monthly_surplus_usd * multiplier;

  const isUSD = currency === 'USD';
  const formatMoney = (usdVal: number) => {
    const val = isUSD ? usdVal : usdVal * fxRate;
    const symbol = isUSD ? '$' : '₹';
    return `${symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Spending categories distribution
  const categories = [
    {
      name: 'Mortgage & Housing (HDFC Note)',
      amountUsd: 1495 * multiplier,
      percentage: 43.7,
      color: 'bg-purple-500',
      textColor: 'text-purple-400',
    },
    {
      name: 'Credit Cards Debt Service (Citi/Chase)',
      amountUsd: 820 * multiplier,
      percentage: 24.0,
      color: 'bg-rose-500',
      textColor: 'text-rose-400',
    },
    {
      name: 'Auto Loan Note (Toyota Financial)',
      amountUsd: 485 * multiplier,
      percentage: 14.2,
      color: 'bg-cyan-500',
      textColor: 'text-cyan-400',
    },
    {
      name: 'Utilities & Telecoms (Verizon, Jio, PSEG)',
      amountUsd: 320 * multiplier,
      percentage: 9.4,
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
    },
    {
      name: 'Recurring Subscriptions & SaaS (Wallos)',
      amountUsd: 178 * multiplier,
      percentage: 5.2,
      color: 'bg-blue-500',
      textColor: 'text-blue-400',
    },
    {
      name: 'Living & Miscellaneous',
      amountUsd: 122 * multiplier,
      percentage: 3.5,
      color: 'bg-slate-500',
      textColor: 'text-slate-400',
    },
  ];

  // Inflow vs Outflow ratio
  const maxCashflow = Math.max(inflowUsd, outflowUsd);
  const inflowPercent = (inflowUsd / maxCashflow) * 100;
  const outflowPercent = (outflowUsd / maxCashflow) * 100;

  return (
    <div className="bg-vault-950/90 border border-vault-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Header with Time Horizon Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-vault-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-vault-900 border border-vault-800 flex items-center justify-center text-vault-emerald">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              Cashflow & Outflow Analytics
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                Paychex + Bank Reconciled
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Verified income stream vs fixed debt, housing, and recurring obligations
            </p>
          </div>
        </div>

        {/* Time Horizon Pills */}
        <div className="flex items-center bg-vault-900 border border-vault-800 rounded-xl p-0.5 text-xs self-start sm:self-auto">
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setTimeHorizon('month');
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeHorizon === 'month'
                ? 'bg-vault-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setTimeHorizon('quarter');
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeHorizon === 'quarter'
                ? 'bg-vault-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Quarterly
          </button>
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setTimeHorizon('year');
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeHorizon === 'year'
                ? 'bg-vault-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Annualized
          </button>
        </div>
      </div>

      {/* Main Dual Grid: Inflow vs Outflow Comparison & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Macro Inflow vs Outflow Visualizer (Twisty & Fintrack style) */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
            Macro Cash Inflow vs Outflow
          </span>

          {/* Inflow Metric Card */}
          <div className="p-4 rounded-2xl bg-vault-900/70 border border-vault-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                Verified Total Inflow
              </span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                +{formatMoney(inflowUsd)}
              </span>
            </div>
            <div className="w-full bg-vault-950 rounded-full h-2.5 overflow-hidden border border-vault-800">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${inflowPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">
              Direct deposit weekly payroll ($1,210.02/wk net)
            </span>
          </div>

          {/* Outflow Metric Card */}
          <div className="p-4 rounded-2xl bg-vault-900/70 border border-vault-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                Total Fixed Outflow & Burn
              </span>
              <span className="text-slate-200 font-mono font-bold text-sm">
                -{formatMoney(outflowUsd)}
              </span>
            </div>
            <div className="w-full bg-vault-950 rounded-full h-2.5 overflow-hidden border border-vault-800">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${outflowPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">
              Debt service + living expenses + recurring subscriptions
            </span>
          </div>

          {/* Retained Net Surplus Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                Net Retained Capital (Surplus)
              </span>
              <span className="text-xl font-extrabold text-white font-mono mt-0.5 block">
                +{formatMoney(surplusUsd)}
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
              {((surplusUsd / inflowUsd) * 100).toFixed(0)}% Savings Rate
            </span>
          </div>
        </div>

        {/* Right Column: Category Expense Allocation (Fintrack style) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
              Outflow Allocation by Category
            </span>
            <span className="text-xs text-slate-500 font-mono">100% Accounted</span>
          </div>

          {/* Segmented multi-color progress bar */}
          <div className="w-full h-3 rounded-full bg-vault-950 border border-vault-800 flex overflow-hidden">
            {categories.map((c, idx) => (
              <div
                key={idx}
                className={`${c.color} h-full transition-all`}
                style={{ width: `${c.percentage}%` }}
                title={`${c.name}: ${c.percentage}%`}
              />
            ))}
          </div>

          {/* Granular category rows */}
          <div className="space-y-2 pt-1">
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className="p-2.5 sm:p-3 rounded-xl bg-vault-900/60 border border-vault-800/80 flex items-center justify-between text-xs hover:border-vault-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${cat.color}`} />
                  <span className="text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
                    {cat.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                    {cat.percentage}%
                  </span>
                  <span className="text-white font-mono font-bold">
                    {formatMoney(cat.amountUsd)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default CashflowAnalytics;
