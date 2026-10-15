import React, { useState } from 'react';
import { Currency, ForecastResult } from '../types';
import { Sparkles, Calendar, Zap, Lightbulb } from 'lucide-react';

interface Props {
  forecast: ForecastResult;
  currency: Currency;
  fxRate: number;
}

export const ForecasterChart: React.FC<Props> = ({ forecast, currency, fxRate }) => {
  const [extraMonthlySavings, setExtraMonthlySavings] = useState(150);

  const isUSD = currency === 'USD';
  const multiplier = isUSD ? 1 : fxRate;

  // Compute curve with extra habit savings
  const curve = forecast.projected_12m_curve_usd.map((base, idx) => {
    const extra = extraMonthlySavings * (idx + 1);
    return (base + extra) * multiplier;
  });

  const minVal = Math.min(...curve);
  const maxVal = Math.max(...curve);
  const range = maxVal - minVal || 1;

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-6 rounded-2xl bg-vault-900 border border-vault-800 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            12-Month Spending & Net Worth Forecaster
            <Sparkles className="w-4 h-4 text-vault-gold" />
          </h2>
          <p className="text-xs text-slate-400">
            Monte Carlo habit simulation based on recurring burn, subscriptions & debt payoff
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase">Projected 1-Yr Net Worth</span>
          <span className="text-xl font-black text-vault-gold">
            {formatMoney(curve[curve.length - 1] || 0)}
          </span>
        </div>
      </div>

      {/* Interactive Habit Slider */}
      <div className="p-4 rounded-xl bg-vault-950 border border-vault-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-vault-cyan" />
            Spending Habit Adjustment (Curbing Dining / Subscriptions)
          </span>
          <strong className="text-vault-cyan text-sm">
            +{formatMoney(extraMonthlySavings * multiplier)}/mo
          </strong>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="25"
          value={extraMonthlySavings}
          onChange={(e) => setExtraMonthlySavings(parseInt(e.target.value))}
          className="w-full accent-vault-cyan cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>Current trajectory ($0)</span>
          <span>Aggressive frugal mode (+$1,000/mo)</span>
        </div>
      </div>

      {/* SVG Trajectory Chart */}
      <div className="relative h-44 w-full pt-4">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#58a6ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={`
              M 0 120
              ${curve
                .map((val, i) => {
                  const x = (i / (curve.length - 1)) * 500;
                  const y = 120 - ((val - minVal) / range) * 100 - 10;
                  return `L ${x} ${y}`;
                })
                .join(' ')}
              L 500 120 Z
            `}
            fill="url(#curveGradient)"
          />

          {/* Line stroke */}
          <path
            d={curve
              .map((val, i) => {
                const x = (i / (curve.length - 1)) * 500;
                const y = 120 - ((val - minVal) / range) * 100 - 10;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#58a6ff"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Node dots */}
          {curve.map((val, i) => {
            const x = (i / (curve.length - 1)) * 500;
            const y = 120 - ((val - minVal) / range) * 100 - 10;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                className="fill-vault-950 stroke-vault-cyan stroke-2 hover:r-6 transition-all cursor-pointer"
              />
            );
          })}
        </svg>

        {/* Month tick labels */}
        <div className="flex justify-between text-[10px] text-slate-500 mt-2">
          <span>Now</span>
          <span>M+3</span>
          <span>M+6</span>
          <span>M+9</span>
          <span>M+12</span>
        </div>
      </div>

      {/* AI Spending Habit Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div className="p-3.5 rounded-xl bg-vault-950/80 border border-vault-800 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">Prune Subscriptions Drag</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Flagging 2 unused Google Play / SaaS subscriptions recovers{' '}
              <strong className="text-emerald-400">{formatMoney(320 * multiplier)}/yr</strong> with 0 impact on lifestyle.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-vault-950/80 border border-vault-800 flex items-start gap-3">
          <Calendar className="w-5 h-5 text-vault-cyan shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">Avalanche Debt Payoff Priority</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Directing +${extraMonthlySavings}/mo surplus to highest APR credit card saves{' '}
              <strong className="text-emerald-400">{formatMoney(410 * multiplier)}</strong> in compounding interest.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
