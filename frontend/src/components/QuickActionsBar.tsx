import React, { useState } from 'react';
import { Currency } from '../types';
import {
  ArrowRightLeft,
  Flame,
  FileSpreadsheet,
  Globe,
  TrendingUp,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';
import { LiveFXConverterModal } from './LiveFXConverterModal';

interface Props {
  currency?: Currency;
  fxRate: number;
  onApplyFxRate?: (rate: number, providerName?: string) => void;
  onNavigateTab: (tab: 'overview' | 'independence' | 'accounts' | 'transactions' | 'subscriptions' | 'splitwise' | 'forecaster' | 'import') => void;
}

export const QuickActionsBar: React.FC<Props> = ({ fxRate, onApplyFxRate, onNavigateTab }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'converter' | 'remitly_compare'>('remitly_compare');

  const handleOpenRemittance = () => {
    nativeBridge.triggerHaptic('medium');
    setModalMode('remitly_compare');
    setShowModal(true);
  };

  const handleOpenConverter = () => {
    nativeBridge.triggerHaptic('light');
    setModalMode('converter');
    setShowModal(true);
  };

  const handleApply = (newRate: number, providerName?: string) => {
    if (onApplyFxRate) {
      onApplyFxRate(newRate, providerName);
    }
  };

  return (
    <>
      {/* Quick Action Buttons Grid (Inspired by iBanko & Fintrack with Monarch squircle curves) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 font-sans">
        {/* Action 1: Send Remittance (Live Remitly & Crobo) */}
        <button
          onClick={handleOpenRemittance}
          className="p-3.5 sm:p-4 rounded-3xl bg-vault-900/80 border border-slate-800/80 hover:border-blue-500/50 flex flex-col items-center sm:items-start justify-between gap-2.5 transition-all hover:bg-vault-850 text-left group shadow-sm hover:shadow-md cursor-pointer"
        >
          <div className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shadow-inner">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Send Remit</span>
            <span className="text-[10px] text-slate-400 block font-mono">Remitly & Crobo Live</span>
          </div>
        </button>

        {/* Action 2: Live FX Converter */}
        <button
          onClick={handleOpenConverter}
          className="p-3.5 sm:p-4 rounded-3xl bg-vault-900/80 border border-slate-800/80 hover:border-amber-500/50 flex flex-col items-center sm:items-start justify-between gap-2.5 transition-all hover:bg-vault-850 text-left group shadow-sm hover:shadow-md cursor-pointer"
        >
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shadow-inner">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">FX Converter</span>
            <span className="text-[10px] text-amber-400/90 block font-mono font-semibold">1 USD ≈ ₹{fxRate.toFixed(2)}</span>
          </div>
        </button>

        {/* Action 3: FIRE Strategy */}
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            onNavigateTab('independence');
          }}
          className="p-3.5 sm:p-4 rounded-3xl bg-vault-900/80 border border-slate-800/80 hover:border-orange-500/50 flex flex-col items-center sm:items-start justify-between gap-2.5 transition-all hover:bg-vault-850 text-left group shadow-sm hover:shadow-md cursor-pointer"
        >
          <div className="w-9 h-9 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform shadow-inner">
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
          className="p-3.5 sm:p-4 rounded-3xl bg-vault-900/80 border border-slate-800/80 hover:border-emerald-500/50 flex flex-col items-center sm:items-start justify-between gap-2.5 transition-all hover:bg-vault-850 text-left group shadow-sm hover:shadow-md cursor-pointer"
        >
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-inner">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Forecaster</span>
            <span className="text-[10px] text-slate-400 block font-mono">Monte Carlo Sim</span>
          </div>
        </button>

        {/* Action 5: Import CSV / Statements */}
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            onNavigateTab('import');
          }}
          className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-3xl bg-vault-900/80 border border-slate-800/80 hover:border-cyan-500/50 flex flex-col items-center sm:items-start justify-between gap-2.5 transition-all hover:bg-vault-850 text-left group shadow-sm hover:shadow-md cursor-pointer"
        >
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shadow-inner">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Import Statements</span>
            <span className="text-[10px] text-slate-400 block font-mono">Offline Local Parser</span>
          </div>
        </button>
      </div>

      {/* Dynamic Live FX & Remittance Suite Modal */}
      <LiveFXConverterModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        activeFxRate={fxRate}
        onApplyRate={handleApply}
        initialMode={modalMode}
      />
    </>
  );
};
export default QuickActionsBar;
