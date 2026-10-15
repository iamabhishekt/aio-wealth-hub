import React from 'react';
import { Currency, ForecastResult } from '../types';
import { ShieldCheck, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
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
  const surplus = isUSD ? forecast.monthly_surplus_usd : forecast.monthly_surplus_usd * fxRate;

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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-vault-900 via-vault-800 to-vault-900 p-6 border border-vault-700 shadow-2xl">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-vault-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-vault-emerald/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Hardware Vault Secured
          </span>
          <span className="text-xs text-slate-400">
            FX: 1 USD ≈ ₹{fxRate.toFixed(2)}
          </span>
        </div>

        {/* Currency Switcher & Refresh */}
        <div className="flex items-center gap-2">
          <div className="bg-vault-950 p-1 rounded-xl border border-vault-700 flex items-center">
            <button
              onClick={() => handleCurrencySwitch('USD')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                isUSD
                  ? 'bg-vault-cyan text-vault-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              $ USD
            </button>
            <button
              onClick={() => handleCurrencySwitch('INR')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
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

      {/* Main Net Worth Metric */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">
          Global Consolidated Net Worth
        </p>
        <div className="flex items-baseline gap-3">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            {formatMoney(netWorth)}
          </h1>
          <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
            surplus >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}>
            {surplus >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {formatMoney(Math.abs(surplus))}/mo {surplus >= 0 ? 'surplus' : 'deficit'}
          </span>
        </div>
      </div>

      {/* Three Pillars: Assets, Liabilities, Monthly Burn */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-vault-950/60 border border-vault-700/60 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Assets</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {formatMoney(assets)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cash + Stock + Indian MF & LIC</p>
        </div>

        <div className="p-4 rounded-xl bg-vault-950/60 border border-vault-700/60 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Liabilities</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400">
            {formatMoney(liabilities)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Amex + Apple Card + Auto Loan</p>
        </div>

        <div className="p-4 rounded-xl bg-vault-950/60 border border-vault-700/60 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Fixed Monthly Outflow</span>
            <span className="text-xs text-amber-400">Recurring</span>
          </div>
          <div className="text-xl font-bold text-amber-400">
            {formatMoney(isUSD ? forecast.monthly_burn_usd : forecast.monthly_burn_usd * fxRate)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Debt service + subscriptions</p>
        </div>
      </div>
    </div>
  );
};
