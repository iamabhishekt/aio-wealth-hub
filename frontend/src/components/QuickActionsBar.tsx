import React, { useState } from 'react';
import { Currency } from '../types';
import {
  ArrowRightLeft,
  Flame,
  FileSpreadsheet,
  Globe,
  TrendingUp,
  X,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  currency?: Currency;
  fxRate: number;
  onNavigateTab: (tab: 'overview' | 'independence' | 'accounts' | 'transactions' | 'subscriptions' | 'splitwise' | 'forecaster' | 'import') => void;
}

export const QuickActionsBar: React.FC<Props> = ({ fxRate, onNavigateTab }) => {
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);
  const [showFxModal, setShowFxModal] = useState(false);

  // Remittance calculator state
  const [remitAmountUsd, setRemitAmountUsd] = useState('1000');
  const [selectedGateway, setSelectedGateway] = useState<'remitly' | 'crobo'>('crobo');

  // FX calculator state
  const [fxInput, setFxInput] = useState('100');
  const [fxDirection, setFxDirection] = useState<'usd_to_inr' | 'inr_to_usd'>('usd_to_inr');

  const remitUsd = parseFloat(remitAmountUsd) || 0;
  // Crobo has near-zero markup, Remitly has ~0.5% fee
  const croboRate = fxRate;
  const remitlyRate = fxRate * 0.992;
  const landedInr = selectedGateway === 'crobo' ? remitUsd * croboRate : remitUsd * remitlyRate;

  const fxInVal = parseFloat(fxInput) || 0;
  const fxOutVal =
    fxDirection === 'usd_to_inr'
      ? fxInVal * fxRate
      : fxInVal / fxRate;

  return (
    <>
      {/* Quick Action Buttons Grid (Inspired by iBanko & Fintrack) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Action 1: Send Remittance */}
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('medium');
            setShowRemittanceModal(true);
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-vault-900/80 border border-vault-800 hover:border-vault-700 flex flex-col items-center sm:items-start justify-between gap-2 transition-all hover:bg-vault-850 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Send Remit</span>
            <span className="text-[10px] text-slate-400 block font-mono">Crobo & Remitly</span>
          </div>
        </button>

        {/* Action 2: Live FX Converter */}
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setShowFxModal(true);
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-vault-900/80 border border-vault-800 hover:border-vault-700 flex flex-col items-center sm:items-start justify-between gap-2 transition-all hover:bg-vault-850 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">FX Converter</span>
            <span className="text-[10px] text-slate-400 block font-mono">1 USD ≈ ₹{fxRate.toFixed(2)}</span>
          </div>
        </button>

        {/* Action 3: FIRE Strategy */}
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            onNavigateTab('independence');
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-vault-900/80 border border-vault-800 hover:border-vault-700 flex flex-col items-center sm:items-start justify-between gap-2 transition-all hover:bg-vault-850 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">FIRE Targets</span>
            <span className="text-[10px] text-slate-400 block font-mono">4% SWR & Runway</span>
          </div>
        </button>

        {/* Action 4: 12M Forecaster */}
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            onNavigateTab('forecaster');
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-vault-900/80 border border-vault-800 hover:border-vault-700 flex flex-col items-center sm:items-start justify-between gap-2 transition-all hover:bg-vault-850 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Forecaster</span>
            <span className="text-[10px] text-slate-400 block font-mono">Monte Carlo Sim</span>
          </div>
        </button>

        {/* Action 5: Import CSV / PDFs */}
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            onNavigateTab('import');
          }}
          className="col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-2xl bg-vault-900/80 border border-vault-800 hover:border-vault-700 flex flex-col items-center sm:items-start justify-between gap-2 transition-all hover:bg-vault-850 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Import Statements</span>
            <span className="text-[10px] text-slate-400 block font-mono">Offline Local Parser</span>
          </div>
        </button>
      </div>

      {/* REMITTANCE MODAL (US ➔ India Pipeline) */}
      {showRemittanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-vault-950 border border-vault-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-vault-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cross-Border Remittance Calculator</h3>
                  <p className="text-xs text-slate-400">US Checking ($) ➔ SBI & HDFC Loan (₹)</p>
                </div>
              </div>
              <button
                onClick={() => setShowRemittanceModal(false)}
                className="p-1.5 rounded-xl bg-vault-900 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Input USD */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">
                  You Dispatch (USD from Chase / Direct Deposit)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={remitAmountUsd}
                    onChange={(e) => setRemitAmountUsd(e.target.value)}
                    className="w-full bg-vault-900 border border-vault-800 rounded-xl pl-8 pr-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                    placeholder="1000"
                  />
                </div>
              </div>

              {/* Gateway Choice */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Select Gateway</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedGateway('crobo')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedGateway === 'crobo'
                        ? 'bg-blue-500/15 text-white border-blue-500/40 ring-1 ring-blue-500/40'
                        : 'bg-vault-900 text-slate-400 border-vault-800'
                    }`}
                  >
                    <div className="text-xs font-bold text-blue-400">Crobo.money</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Rate: 1 USD = ₹{croboRate.toFixed(2)}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Zero Transfer Fee</div>
                  </button>

                  <button
                    onClick={() => setSelectedGateway('remitly')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedGateway === 'remitly'
                        ? 'bg-purple-500/15 text-white border-purple-500/40 ring-1 ring-purple-500/40'
                        : 'bg-vault-900 text-slate-400 border-vault-800'
                    }`}
                  >
                    <div className="text-xs font-bold text-purple-400">Remitly Express</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Rate: 1 USD = ₹{remitlyRate.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Instant UPI / IMPS</div>
                  </button>
                </div>
              </div>

              {/* Estimated Landed INR */}
              <div className="p-4 rounded-2xl bg-vault-900/90 border border-vault-800 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  Estimated Landed in India (SBI / HDFC)
                </span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ₹{landedInr.toLocaleString(undefined, { maximumFractionDigits: 0 })} INR
                </div>
                <p className="text-[11px] text-slate-500">
                  Directly services HDFC NRI Home Loan EMI (₹1,42,479/mo) or SBI Liquid Savings.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowRemittanceModal(false)}
                className="px-4 py-2 bg-vault-900 hover:bg-vault-850 text-slate-300 font-semibold text-xs rounded-xl border border-vault-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('success');
                  nativeBridge.scheduleLocalNotification(
                    'Remittance Logged',
                    `Scheduled $${remitUsd} USD dispatch -> ₹${Math.round(landedInr)} INR.`
                  );
                  setShowRemittanceModal(false);
                }}
                className="px-5 py-2 bg-vault-cyan text-vault-950 font-black text-xs rounded-xl hover:opacity-90 transition-opacity"
              >
                Log Remittance Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE FX CONVERTER MODAL */}
      {showFxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-vault-950 border border-vault-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-vault-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Live FX Converter</h3>
              </div>
              <button
                onClick={() => setShowFxModal(false)}
                className="p-1.5 rounded-xl bg-vault-900 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-vault-900 p-1 rounded-xl border border-vault-800 text-xs">
                <button
                  onClick={() => setFxDirection('usd_to_inr')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    fxDirection === 'usd_to_inr'
                      ? 'bg-vault-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  USD ($) ➔ INR (₹)
                </button>
                <button
                  onClick={() => setFxDirection('inr_to_usd')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    fxDirection === 'inr_to_usd'
                      ? 'bg-vault-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  INR (₹) ➔ USD ($)
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Amount in {fxDirection === 'usd_to_inr' ? 'USD ($)' : 'INR (₹)'}
                </label>
                <input
                  type="number"
                  value={fxInput}
                  onChange={(e) => setFxInput(e.target.value)}
                  className="w-full bg-vault-900 border border-vault-800 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-vault-900/90 border border-vault-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
                  Converted Output (@ 1 USD = ₹{fxRate.toFixed(2)})
                </span>
                <div className="text-2xl font-black font-mono text-vault-gold mt-1">
                  {fxDirection === 'usd_to_inr'
                    ? `₹${fxOutVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} INR`
                    : `$${fxOutVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowFxModal(false)}
                className="w-full py-2.5 bg-vault-cyan text-vault-950 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default QuickActionsBar;
