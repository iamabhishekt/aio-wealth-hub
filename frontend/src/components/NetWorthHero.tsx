import React from 'react';
import { Currency, ForecastResult } from '../types';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wallet,
  Clock,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  forecast: ForecastResult;
  currency: Currency;
  onToggleCurrency: (c: Currency) => void;
  fxRate: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const NetWorthHero: React.FC<Props> = ({
  forecast,
  currency,
  onToggleCurrency,
  fxRate,
  onRefresh,
  isRefreshing,
}) => {
  const isUSD = currency === 'USD';
  const netWorth = isUSD ? forecast.current_net_worth_usd : forecast.current_net_worth_inr;
  const assets = isUSD ? forecast.total_assets_usd : forecast.total_assets_usd * fxRate;
  const liabilities = isUSD ? forecast.total_liabilities_usd : forecast.total_liabilities_usd * fxRate;
  const monthlyBurn = isUSD ? forecast.monthly_burn_usd : forecast.monthly_burn_usd * fxRate;
  const surplus = isUSD ? forecast.monthly_surplus_usd : forecast.monthly_surplus_usd * fxRate;

  // Liquid Runway in months
  const liquidRunwayMonths = monthlyBurn > 0 ? (assets / monthlyBurn).toFixed(1) : '—';

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(isUSD ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleCurrencySwitch = (next: Currency) => {
    nativeBridge.triggerHaptic('light');
    onToggleCurrency(next);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-vault-900 via-vault-800 to-vault-900 p-4 sm:p-6 lg:p-8 border border-vault-700 shadow-2xl">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-vault-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-vault-emerald/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Hardware Vault Secured
          </span>
          <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
            FX: 1 USD ≈ ₹{fxRate.toFixed(2)}
          </span>
        </div>

        {/* Currency Switcher & Refresh */}
        <div className="flex items-center gap-2">
          <div className="bg-vault-950 p-1 rounded-xl border border-vault-700 flex items-center">
            <button
              onClick={() => handleCurrencySwitch('USD')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                isUSD
                  ? 'bg-vault-cyan text-vault-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              $ USD
            </button>
            <button
              onClick={() => handleCurrencySwitch('INR')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                !isUSD
                  ? 'bg-vault-gold text-vault-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ₹ INR
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-vault-950 border border-vault-700 text-slate-400 hover:text-white transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-vault-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Net Worth Metric (HaraPro Consolidated Net Worth Concept) */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">
          <Wallet className="w-3.5 h-3.5 text-slate-400" />
          <span>Global Consolidated Net Worth</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-mono">
            {formatMoney(netWorth)}
          </h1>
          <span
            className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
              surplus >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {surplus >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            )}
            {formatMoney(Math.abs(surplus))}/mo {surplus >= 0 ? 'net surplus' : 'deficit'}
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-vault-950/60 border border-vault-800">
            <Clock className="w-3 h-3 text-cyan-400" />
            Liquid Runway: <strong className="text-white font-mono">{liquidRunwayMonths} mo</strong>
          </span>
        </div>
      </div>

      {/* Three Pillars: Assets, Liabilities, Monthly Burn (HaraPro + Copilot Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Assets Pillar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-vault-950/60 border border-vault-800/80 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Assets</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {formatMoney(assets)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Liquid Cash + Brokerage + 401(k)</p>
        </div>

        {/* Liabilities Pillar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-vault-950/60 border border-vault-800/80 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Liabilities</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
            {formatMoney(liabilities)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">HDFC Home Loan, Toyota Auto, Cards</p>
        </div>

        {/* Fixed Monthly Outflow Pillar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-vault-950/60 border border-vault-800/80 backdrop-blur sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Fixed Monthly Outflow</span>
            <span className="text-[10px] text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
              Recurring
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {formatMoney(monthlyBurn)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Debt service + living + subscriptions</p>
        </div>
      </div>
    </div>
  );
};
export default NetWorthHero;
