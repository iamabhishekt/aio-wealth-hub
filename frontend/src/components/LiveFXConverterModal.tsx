import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  RefreshCw,
  CheckCircle2,
  X,
  Sparkles,
  Clock,
} from 'lucide-react';

export interface ProviderQuote {
  id: string;
  name: string;
  category: string;
  exchange_rate: number;
  spread_pct: number;
  fee_usd: number;
  speed: string;
  badge: string;
  is_recommended: boolean;
  landed_inr: number;
  difference_vs_best_inr: number;
}

export interface LiveFxData {
  source: string;
  target: string;
  market_rate: number;
  query_amount_usd: number;
  timestamp: string;
  providers: ProviderQuote[];
  crobo_rate: number;
  remitly_express_rate: number;
  remitly_economy_rate: number;
  wise_rate: number;
  bank_wire_rate: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeFxRate: number;
  onApplyRate: (rate: number, providerName?: string) => void;
  initialMode?: 'converter' | 'remitly_compare';
}

export const LiveFXConverterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeFxRate,
  onApplyRate,
  initialMode = 'converter',
}) => {
  const [mode, setMode] = useState<'converter' | 'remitly_compare'>(initialMode);
  const [data, setData] = useState<LiveFxData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Interactive inputs
  const [amountUsd, setAmountUsd] = useState<string>('1500');
  const [customRate, setCustomRate] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Direction for quick converter
  const [direction, setDirection] = useState<'usd_to_inr' | 'inr_to_usd'>('usd_to_inr');
  const [convertAmount, setConvertAmount] = useState<string>('100');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const fetchLiveRates = async (amount: number = 1500) => {
    try {
      setRefreshing(true);
      const res = await fetch(`http://localhost:8088/api/fx/live?amount=${amount}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch live FX rates:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const num = parseFloat(amountUsd) || 1500;
      fetchLiveRates(num);
    }
  }, [isOpen]);

  const handleAmountChange = (val: string) => {
    setAmountUsd(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      fetchLiveRates(num);
    }
  };

  const handleApply = (rate: number, label: string) => {
    onApplyRate(rate, label);
    setAppliedNotification(`Applied ${label} rate (₹${rate.toFixed(2)}) globally to all assets & loans!`);
    setTimeout(() => {
      setAppliedNotification(null);
    }, 3500);
  };

  const handleApplyCustomRate = (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseFloat(customRate);
    if (!isNaN(r) && r > 50 && r < 150) {
      handleApply(r, 'Custom Promotional Rate');
      setShowCustomInput(false);
    }
  };

  if (!isOpen) return null;

  const currentMarketRate = data?.market_rate || activeFxRate || 95.25;
  const parsedConvertAmount = parseFloat(convertAmount) || 0;
  const convertedResult =
    direction === 'usd_to_inr'
      ? parsedConvertAmount * activeFxRate
      : parsedConvertAmount / activeFxRate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-vault-900 border border-slate-800/80 rounded-4xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header with Live Ticker */}
        <div className="p-6 sm:p-8 border-b border-slate-800/80 bg-gradient-to-r from-vault-900 via-vault-850 to-vault-900 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Live FX & Remittance Suite
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Interbank: ₹{currentMarketRate.toFixed(2)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time quotes with verified spreads for Remitly, Crobo, Wise, and bank wires.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLiveRates(parseFloat(amountUsd) || 1500)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Live Market Quotes"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="px-6 sm:px-8 border-b border-slate-800/80 bg-vault-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('remitly_compare')}
              className={`py-3.5 px-4 text-xs sm:text-sm font-semibold transition-all relative ${
                mode === 'remitly_compare'
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Remitly & Corridor Comparison
              {mode === 'remitly_compare' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setMode('converter')}
              className={`py-3.5 px-4 text-xs sm:text-sm font-semibold transition-all relative ${
                mode === 'converter'
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Instant Currency Calculator
              {mode === 'converter' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full" />
              )}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Active Hub Rate:</span>
            <span className="text-cyan-300 font-bold px-2 py-0.5 rounded-lg bg-vault-900 border border-slate-800">
              1 USD = ₹{activeFxRate.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notification Toast */}
        {appliedNotification && (
          <div className="px-6 sm:px-8 py-2.5 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{appliedNotification}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {mode === 'remitly_compare' ? (
            <div className="space-y-6">
              {/* Send Amount Input Controls */}
              <div className="p-5 rounded-3xl bg-vault-850/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Send Amount from US Bank (Chase / Payroll)
                  </label>
                  <p className="text-xs text-slate-400">
                    Calculates exact landed rupees across providers after fees & spreads.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold font-mono">$</span>
                    <input
                      type="number"
                      value={amountUsd}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="w-36 sm:w-44 pl-8 pr-3 py-2 rounded-xl bg-vault-950 border border-slate-700 text-sm font-bold font-mono text-white focus:outline-none focus:border-cyan-500"
                      placeholder="1500"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {['500', '1000', '2500'].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleAmountChange(val)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold transition-colors ${
                          amountUsd === val
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-vault-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Provider Comparison Grid */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs">Fetching verified exchange spreads and fees...</span>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {(data?.providers || []).map((p) => {
                    const isBank = p.id === 'bank_wire';
                    const isCrobo = p.id === 'crobo';
                    const isActive = Math.abs(activeFxRate - p.exchange_rate) < 0.05;

                    return (
                      <div
                        key={p.id}
                        className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isBank
                            ? 'bg-rose-950/10 border-rose-500/20'
                            : isCrobo
                            ? 'bg-vault-850/90 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                            : 'bg-vault-850/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Provider Details */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-base font-bold text-white tracking-tight">
                              {p.name}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                isBank
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : isCrobo
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              }`}
                            >
                              {p.badge}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                Currently Active
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                            <span>
                              Guaranteed Rate: <strong className="text-slate-200">₹{p.exchange_rate.toFixed(2)}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Transfer Fee: <strong className={p.fee_usd === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                {p.fee_usd === 0 ? 'Free ($0.00)' : `$${p.fee_usd.toFixed(2)}`}
                              </strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {p.speed}
                            </span>
                          </div>
                        </div>

                        {/* Landed Net INR & CTA */}
                        <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                          <div className="text-left md:text-right">
                            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                              Total Landed in India
                            </span>
                            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                              ₹{p.landed_inr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            {p.difference_vs_best_inr < 0 && (
                              <span className="text-[10px] text-rose-400 font-mono block">
                                ₹{Math.abs(Math.round(p.difference_vs_best_inr)).toLocaleString()} less than optimal
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleApply(p.exchange_rate, p.name)}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              isActive
                                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-600/20'
                            }`}
                          >
                            {isActive ? 'Active Rate' : 'Apply Rate'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Promotional or Custom Rate Override Box */}
              <div className="p-5 rounded-3xl bg-vault-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Have a promotional rate or special quote?
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className="text-xs text-cyan-400 hover:underline font-semibold cursor-pointer"
                  >
                    {showCustomInput ? 'Hide' : '+ Enter Custom Quote'}
                  </button>
                </div>

                {showCustomInput && (
                  <form onSubmit={handleApplyCustomRate} className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={customRate}
                        onChange={(e) => setCustomRate(e.target.value)}
                        placeholder="e.g. 96.50 (Remitly First-Transfer Promo)"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-vault-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      Apply Custom Quote
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* Instant Converter View */
            <div className="space-y-6 max-w-lg mx-auto py-4">
              {/* Direction Selector */}
              <div className="grid grid-cols-2 gap-2 bg-vault-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setDirection('usd_to_inr')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    direction === 'usd_to_inr'
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  USD ($) ➔ INR (₹)
                </button>
                <button
                  onClick={() => setDirection('inr_to_usd')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    direction === 'inr_to_usd'
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  INR (₹) ➔ USD ($)
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                  Amount in {direction === 'usd_to_inr' ? 'US Dollars (USD)' : 'Indian Rupees (INR)'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold font-mono text-base">
                    {direction === 'usd_to_inr' ? '$' : '₹'}
                  </span>
                  <input
                    type="number"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    className="w-full bg-vault-950 border border-slate-800 rounded-2xl pl-9 pr-4 py-3 text-lg font-bold font-mono text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Real Converted Value Banner */}
              <div className="p-6 rounded-3xl bg-vault-950 border border-slate-800/90 text-center space-y-2 card-glow">
                <span className="text-[11px] text-slate-400 uppercase tracking-widest block font-mono">
                  Calculated Output (@ 1 USD = ₹{activeFxRate.toFixed(2)})
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-vault-gold tracking-tight">
                  {direction === 'usd_to_inr'
                    ? `₹${convertedResult.toLocaleString(undefined, { maximumFractionDigits: 2 })} INR`
                    : `$${convertedResult.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`}
                </div>
                <p className="text-xs text-slate-400">
                  Services HDFC Home Loan EMI or SBI NRI NRE/NRO accounts directly.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-vault-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Active Rate: 1 USD = ₹{activeFxRate.toFixed(2)}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
