import React, { useState } from 'react';
import { Account, Currency } from '../types';
import {
  CreditCard,
  Wifi,
  ChevronRight,
  ChevronLeft,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  accounts?: Account[];
  currency: Currency;
  fxRate: number;
  onSelectAccount?: (accountId: string) => void;
  selectedAccountId?: string | null;
}

interface CardVisualData {
  id: string;
  name: string;
  institution: string;
  cardNumber: string;
  balance: number;
  currency: Currency;
  apr: number | null;
  minPayment: number | null;
  cardType: 'visa' | 'mastercard' | 'amex' | 'hdfc' | 'sbi';
  theme: {
    bgGradient: string;
    chipColor: string;
    textColor: string;
    badgeBg: string;
    border: string;
  };
}

export const VirtualCardWallet: React.FC<Props> = ({
  currency,
  fxRate,
  onSelectAccount,
  selectedAccountId,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Curate primary featured cards from real accounts
  const featuredCards: CardVisualData[] = [
    {
      id: 'ACT-f8fd5f7f-cac1-417a-8c27-5f4c845c23ad',
      name: 'Chase Sapphire Preferred',
      institution: 'JPMorgan Chase',
      cardNumber: '7937',
      balance: 3518.78,
      currency: 'USD',
      apr: 21.0,
      minPayment: 45.0,
      cardType: 'visa',
      theme: {
        bgGradient: 'from-blue-950 via-slate-900 to-blue-900',
        chipColor: 'bg-amber-300/80',
        textColor: 'text-blue-100',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        border: 'border-blue-500/40',
      },
    },
    {
      id: 'us-citi-diamond-6617',
      name: 'Citi Diamond Preferred',
      institution: 'Citibank N.A.',
      cardNumber: '6617',
      balance: 6653.42,
      currency: 'USD',
      apr: 21.0,
      minPayment: 65.0,
      cardType: 'mastercard',
      theme: {
        bgGradient: 'from-slate-900 via-zinc-800 to-slate-950',
        chipColor: 'bg-slate-300',
        textColor: 'text-slate-100',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        border: 'border-slate-600/50',
      },
    },
    {
      id: 'in-hdfc-loan-703795941',
      name: 'HDFC NRI Home Loan',
      institution: 'HDFC Bank India',
      cardNumber: '5941',
      balance: 14255700.0,
      currency: 'INR',
      apr: 8.5,
      minPayment: 142479.0,
      cardType: 'hdfc',
      theme: {
        bgGradient: 'from-blue-950 via-indigo-950 to-slate-950',
        chipColor: 'bg-amber-400',
        textColor: 'text-amber-100',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        border: 'border-amber-500/40',
      },
    },
    {
      id: 'us-amex-platinum',
      name: 'American Express Platinum',
      institution: 'American Express',
      cardNumber: '1004',
      balance: 1845.2,
      currency: 'USD',
      apr: 21.0,
      minPayment: 40.0,
      cardType: 'amex',
      theme: {
        bgGradient: 'from-zinc-900 via-neutral-800 to-stone-900',
        chipColor: 'bg-amber-200',
        textColor: 'text-neutral-100',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        border: 'border-zinc-500/40',
      },
    },
    {
      id: 'in-sbi-savings-6073',
      name: 'SBI NRE/NRO Wealth Reserve',
      institution: 'State Bank of India',
      cardNumber: '6073',
      balance: 250000.0,
      currency: 'INR',
      apr: 3.0,
      minPayment: 0.0,
      cardType: 'sbi',
      theme: {
        bgGradient: 'from-emerald-950 via-teal-950 to-slate-950',
        chipColor: 'bg-emerald-300',
        textColor: 'text-emerald-100',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        border: 'border-emerald-500/40',
      },
    },
  ];

  const currentCard = featuredCards[activeIndex];

  React.useEffect(() => {
    if (selectedAccountId) {
      const idx = featuredCards.findIndex((c) => c.id === selectedAccountId);
      if (idx !== -1) setActiveIndex(idx);
    }
  }, [selectedAccountId]);

  const formatMoney = (amt: number, cardCurr: Currency) => {
    let finalVal = amt;
    if (currency === 'USD' && cardCurr === 'INR') finalVal = amt / fxRate;
    if (currency === 'INR' && cardCurr === 'USD') finalVal = amt * fxRate;

    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(finalVal);
  };

  const formatNative = (amt: number, cardCurr: Currency) => {
    return new Intl.NumberFormat(cardCurr === 'USD' ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency: cardCurr,
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const handleNext = () => {
    nativeBridge.triggerHaptic('light');
    setActiveIndex((prev) => (prev + 1) % featuredCards.length);
  };

  const handlePrev = () => {
    nativeBridge.triggerHaptic('light');
    setActiveIndex((prev) => (prev - 1 + featuredCards.length) % featuredCards.length);
  };

  return (
    <div className="bg-vault-950/90 border border-vault-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-2xl backdrop-blur-xl space-y-5">
      {/* Header with Navigation Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-vault-900 border border-vault-800 flex items-center justify-center text-vault-cyan">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              Virtual Card & Credit Vault
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-vault-800 text-slate-300 border border-vault-700 font-semibold">
                {featuredCards.length} Cards
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive physical instrument visualizer · Reconciled live
            </p>
          </div>
        </div>

        {/* Carousel Prev/Next Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-xl bg-vault-900 border border-vault-800 text-slate-400 hover:text-white transition-colors"
            title="Previous card"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-400 font-mono px-1">
            {activeIndex + 1}/{featuredCards.length}
          </span>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-xl bg-vault-900 border border-vault-800 text-slate-400 hover:text-white transition-colors"
            title="Next card"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Virtual Card Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Visual Realistic Credit Card (iBanko & Apple Wallet Inspired) */}
        <div className="lg:col-span-7">
          <div
            onClick={() => {
              nativeBridge.triggerHaptic('medium');
              if (onSelectAccount) onSelectAccount(currentCard.id);
            }}
            className={`cursor-pointer relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl border transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-br ${currentCard.theme.bgGradient} ${currentCard.theme.border}`}
            style={{
              minHeight: '220px',
              aspectRatio: '1.586 / 1', // ISO/IEC 7810 ID-1 credit card ratio
            }}
          >
            {/* Subtle Metallic Card Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />

            {/* Top Row: Institution + Contactless Symbol + Card Brand */}
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-slate-400 block">
                  {currentCard.institution}
                </span>
                <h4 className="text-sm sm:text-base font-black text-white tracking-wide mt-0.5">
                  {currentCard.name}
                </h4>
              </div>

              <div className="flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-slate-300 rotate-90" />
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-bold ${currentCard.theme.badgeBg}`}>
                  {currentCard.currency}
                </span>
              </div>
            </div>

            {/* Middle Row: EMV Contactless Chip */}
            <div className="my-5 relative z-10 flex items-center justify-between">
              <div className="w-11 h-8 rounded-lg bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-300 border border-amber-500/40 shadow-inner flex items-center justify-center">
                <div className="w-7 h-5 border border-amber-600/30 rounded grid grid-cols-2 gap-0.5 opacity-60">
                  <div className="border-r border-b border-amber-700/30" />
                  <div className="border-b border-amber-700/30" />
                  <div className="border-r border-amber-700/30" />
                  <div />
                </div>
              </div>

              {/* Outstanding Balance or Reserve */}
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  {currentCard.cardType === 'sbi' ? 'Reserve Balance' : 'Current Balance'}
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {formatMoney(currentCard.balance, currentCard.currency)}
                </div>
              </div>
            </div>

            {/* Bottom Row: Masked Card Number & Priority Tag */}
            <div className="flex items-end justify-between relative z-10 mt-auto pt-2">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                  Card Number
                </span>
                <span className="text-sm sm:text-base font-mono tracking-widest text-slate-200 font-bold">
                  •••• •••• •••• {currentCard.cardNumber}
                </span>
              </div>

              <div className="text-right">
                {currentCard.apr && (
                  <span className="text-[11px] font-mono text-slate-300 block">
                    APR: <strong className={currentCard.apr >= 20 ? 'text-rose-400' : 'text-slate-200'}>{currentCard.apr}%</strong>
                  </span>
                )}
                {currency !== currentCard.currency && (
                  <span className="text-[10px] font-mono text-slate-400 block">
                    orig: {formatNative(currentCard.balance, currentCard.currency)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card Telemetry & Quick Action Drawer */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-2xl bg-vault-900/80 border border-vault-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Instrument Type</span>
              <span className="text-white font-semibold">
                {currentCard.cardType === 'hdfc'
                  ? 'Mortgage Note (8.5% Fixed)'
                  : currentCard.cardType === 'sbi'
                  ? 'NRE Savings & Remittance'
                  : 'Revolving Credit Line'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Monthly Servicing</span>
              <span className="text-slate-200 font-mono font-bold">
                {currentCard.minPayment
                  ? `${formatMoney(currentCard.minPayment, currentCard.currency)}/mo`
                  : 'None / Full Payoff'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">OpenAccountant Priority</span>
              <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-vault-950 border border-vault-800 text-cyan-400">
                {currentCard.apr && currentCard.apr >= 20
                  ? 'Priority 1 (Avalanche Target)'
                  : currentCard.cardType === 'hdfc'
                  ? 'Priority 4 (Secured Loan)'
                  : 'Liquid Cash Safety'}
              </span>
            </div>
          </div>

          {/* Quick Instrument Action Buttons */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                if (onSelectAccount) onSelectAccount(currentCard.id);
              }}
              className="py-2.5 px-3 rounded-xl bg-vault-900 border border-vault-800 hover:border-vault-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-vault-cyan" />
              <span>Filter Txns</span>
            </button>

            <button
              onClick={() => {
                nativeBridge.triggerHaptic('medium');
                nativeBridge.scheduleLocalNotification(
                  `Payment Reminder: ${currentCard.name}`,
                  `Minimum due of ${formatMoney(currentCard.minPayment || 0, currentCard.currency)} scheduled.`
                );
              }}
              className="py-2.5 px-3 rounded-xl bg-vault-cyan/15 border border-vault-cyan/30 text-vault-cyan hover:bg-vault-cyan/25 font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Auto-Pay Due</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini Thumbnails Strip for Quick Switching */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
        {featuredCards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setActiveIndex(idx);
            }}
            className={`p-2.5 rounded-xl border text-left shrink-0 transition-all flex items-center gap-2.5 ${
              idx === activeIndex
                ? 'bg-vault-900 text-white border-vault-600 shadow-md ring-1 ring-vault-cyan/50'
                : 'bg-vault-950/60 text-slate-400 border-vault-800 hover:text-slate-200'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full ${card.theme.chipColor}`} />
            <div className="text-[11px] leading-tight">
              <span className="font-bold block truncate max-w-[120px]">{card.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">•••• {card.cardNumber}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
export default VirtualCardWallet;
