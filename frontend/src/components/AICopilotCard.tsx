import React from 'react';
import { Currency, ForecastResult } from '../types';
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Zap,
  Flame,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  forecast: ForecastResult;
  currency: Currency;
  fxRate: number;
  onNavigateTab: (tab: 'overview' | 'independence' | 'accounts' | 'transactions' | 'subscriptions' | 'splitwise' | 'forecaster' | 'import') => void;
}

export const AICopilotCard: React.FC<Props> = ({
  forecast,
  currency,
  fxRate,
  onNavigateTab,
}) => {

  const formatMoney = (usdVal: number) => {
    const val = currency === 'USD' ? usdVal : usdVal * fxRate;
    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const insights = [
    {
      id: 1,
      icon: <Flame className="w-4 h-4 text-rose-400" />,
      badge: 'Debt Avalanche Rule',
      badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      title: 'Target 21.0% APR on Citi & Chase',
      desc: 'Paying an extra $200/mo eliminates $1,420 in annual compound interest—guaranteeing a risk-free 21.0% return on capital.',
      actionText: 'Open Debt Plan',
      actionTab: 'independence' as const,
    },
    {
      id: 2,
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      badge: 'Liquid Capital Health',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      title: '3.5 Months Survival Runway',
      desc: `Your liquid reserves in checking and savings cover 3.5 months of fixed baseline expenses (${formatMoney(forecast.monthly_burn_usd)}/mo).`,
      actionText: 'Review Reserves',
      actionTab: 'accounts' as const,
    },
    {
      id: 3,
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      badge: 'Recurring Drag',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      title: 'Wallos Subscription Radar Active',
      desc: `7 recurring obligations detected (${formatMoney(forecast.annual_subscription_drag_usd / 12)}/mo). 1 service flagged for cancellation review.`,
      actionText: 'Inspect Subs',
      actionTab: 'subscriptions' as const,
    },
  ];

  const activeInsights = insights;

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-vault-950 via-vault-900 to-vault-950 border border-cyan-500/30 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Background ambient neural glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-vault-cyan/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                AI Wealth Copilot
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                TypeSafe Jev + OpenAccountant Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Autonomous financial analysis, debt optimization & cashflow telemetry
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold text-slate-400 hidden sm:inline-block">
          Net Surplus: <strong className="text-emerald-400">+{formatMoney(forecast.monthly_surplus_usd)}/mo</strong>
        </span>
      </div>

      {/* Insight Cards Carousel / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {activeInsights.map((item) => (
          <div
            key={item.id}
            className="p-3.5 sm:p-4 rounded-2xl bg-vault-900/80 border border-vault-800/80 hover:border-vault-700 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                  {item.icon}
                  {item.badge}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-snug">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                {item.desc}
              </p>
            </div>

            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                onNavigateTab(item.actionTab);
              }}
              className="mt-3 pt-2.5 border-t border-vault-800/80 flex items-center justify-between text-xs font-semibold text-vault-cyan group-hover:text-cyan-300 transition-colors w-full"
            >
              <span>{item.actionText}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default AICopilotCard;
