import React from 'react';
import { Subscription, Currency } from '../types';
import { Play, Apple, Globe, BellRing, Trash2, CheckCircle2 } from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  subscriptions: Subscription[];
  currency: Currency;
  fxRate: number;
  onToggleStatus: (subId: string) => void;
}

export const SubscriptionRadar: React.FC<Props> = ({
  subscriptions,
  currency,
  fxRate,
  onToggleStatus,
}) => {
  const isUSD = currency === 'USD';

  const monthlyTotal = subscriptions.reduce((acc, sub) => {
    let cost = sub.cost_per_cycle;
    if (sub.currency === 'INR') cost /= fxRate;
    if (sub.cycle.toLowerCase() === 'annual') cost /= 12;
    return acc + cost;
  }, 0);

  const annualTotal = monthlyTotal * 12;

  const formatCost = (cost: number, subCurrency: Currency) => {
    let val = cost;
    if (currency === 'USD' && subCurrency === 'INR') val /= fxRate;
    if (currency === 'INR' && subCurrency === 'USD') val *= fxRate;

    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getSourceIcon = (source: string) => {
    if (source.toLowerCase().includes('google')) {
      return <Play className="w-4 h-4 text-emerald-400" />;
    }
    if (source.toLowerCase().includes('apple')) {
      return <Apple className="w-4 h-4 text-slate-200" />;
    }
    return <Globe className="w-4 h-4 text-vault-cyan" />;
  };

  const handleTestAlert = (sub: Subscription) => {
    nativeBridge.scheduleLocalNotification(
      `Subscription Alert: ${sub.service_name}`,
      `Your subscription of ${formatCost(sub.cost_per_cycle, sub.currency)} is due on ${sub.next_renewal}.`
    );
    nativeBridge.triggerHaptic('medium');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Subscription Creep Radar
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {subscriptions.length} Tracked
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Google Play, Apple In-App Subscriptions & SaaS dragging cashflow
          </p>
        </div>

        <div className="flex items-center gap-3 bg-vault-900 border border-vault-700 px-3 py-1.5 rounded-xl">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase">Annual Drag</span>
            <span className="text-sm font-extrabold text-amber-400">
              {new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
                style: 'currency',
                currency: currency,
                maximumFractionDigits: 0,
              }).format(isUSD ? annualTotal : annualTotal * fxRate)}
              /yr
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {subscriptions.map((sub) => {
          const isCancelled = sub.status === 'FlaggedForCancellation';
          return (
            <div
              key={sub.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isCancelled
                  ? 'bg-rose-950/20 border-rose-900/40 opacity-75'
                  : 'bg-vault-900 border-vault-800 hover:border-vault-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-vault-950 border border-vault-800">
                      {getSourceIcon(sub.source)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{sub.service_name}</h4>
                      <p className="text-[11px] text-slate-400">{sub.source} • {sub.cycle}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white">
                    {formatCost(sub.cost_per_cycle, sub.currency)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Renews: <strong className="text-slate-300">{sub.next_renewal}</strong></span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    isCancelled ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {isCancelled ? 'Flagged to Cancel' : 'Active'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-vault-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestAlert(sub)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-vault-cyan transition-colors"
                  title="Simulate Local Push Notification"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  Notify Me
                </button>

                <button
                  onClick={() => {
                    nativeBridge.triggerHaptic('light');
                    onToggleStatus(sub.id);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    isCancelled
                      ? 'bg-vault-800 text-slate-300 hover:bg-vault-700'
                      : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                  }`}
                >
                  {isCancelled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Cancel Creep
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
