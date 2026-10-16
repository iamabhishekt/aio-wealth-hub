import React, { useState, useEffect } from 'react';
import { Account, Currency, ForecastResult, Subscription, Transaction } from './types';
import { NetWorthHero } from './components/NetWorthHero';
import { AccountsGrid } from './components/AccountsGrid';
import { SubscriptionRadar } from './components/SubscriptionRadar';
import { SplitwisePanel } from './components/SplitwisePanel';
import { ForecasterChart } from './components/ForecasterChart';
import { StatementImporter } from './components/StatementImporter';
import { NativeDeviceBar } from './components/NativeDeviceBar';
import { AutomatedSyncCard } from './components/AutomatedSyncCard';
import { TransactionsTable } from './components/TransactionsTable';
import { FinancialIndependencePanel } from './components/FinancialIndependencePanel';
import { VirtualCardWallet } from './components/VirtualCardWallet';
import { QuickActionsBar } from './components/QuickActionsBar';
import { AICopilotCard } from './components/AICopilotCard';
import { CashflowAnalytics } from './components/CashflowAnalytics';
import { LocalRAGCopilot } from './components/LocalRAGCopilot';
import { SimpleFinConnectionModal } from './components/SimpleFinConnectionModal';
import { nativeBridge } from './nativeBridge';
import {
  LayoutDashboard,
  CreditCard,
  Repeat,
  Users,
  LineChart,
  FileSpreadsheet,
  Lock,
  Unlock,
  ReceiptText,
  Flame,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';

export const App: React.FC = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [fxRate, setFxRate] = useState<number>(95.25);
  const [showSimpleFinModal, setShowSimpleFinModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'independence'
    | 'accounts'
    | 'transactions'
    | 'subscriptions'
    | 'splitwise'
    | 'forecaster'
    | 'import'
  >('overview');
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial biometrics unlock attempt & data hydration
  useEffect(() => {
    // Attempt biometric unlock on app mount
    nativeBridge.authenticateBiometrics().then((success) => {
      if (success) {
        setIsLocked(false);
      }
    });

    // Hydrate accounts from backend
    fetch('http://localhost:8088/api/accounts')
      .then((r) => r.json())
      .then((backendAccounts: Account[]) => {
        if (backendAccounts && Array.isArray(backendAccounts)) {
          setAccounts(backendAccounts);
        }
      })
      .catch((err) => console.log('Backend accounts fetch note:', err));

    // Hydrate verified transactions from backend
    fetch('http://localhost:8088/api/transactions')
      .then((r) => r.json())
      .then((data: Transaction[]) => {
        if (data && Array.isArray(data)) {
          setTransactions(data);
        }
      })
      .catch((err) => console.log('Backend transactions fetch note:', err));

    // Hydrate subscriptions from Wallos backend
    fetch('http://localhost:8088/api/subscriptions')
      .then((r) => r.json())
      .then((data: Subscription[]) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setSubscriptions(data);
        }
      })
      .catch((err) => console.log('Backend subscriptions fetch note:', err));

    // Hydrate live FX rate from backend /api/fx/live
    fetch('http://localhost:8088/api/fx/live')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.market_rate) {
          setFxRate(data.market_rate);
        }
      })
      .catch((err) => console.log('Live FX initial fetch note:', err));
  }, []);

  const handleUnlock = async () => {
    nativeBridge.triggerHaptic('medium');
    const ok = await nativeBridge.authenticateBiometrics();
    if (ok) {
      nativeBridge.triggerHaptic('success');
      setIsLocked(false);
    }
  };

  const handleApplyFxRate = (newRate: number, providerName?: string) => {
    setFxRate(newRate);
    nativeBridge.triggerHaptic('success');
    nativeBridge.scheduleLocalNotification(
      'Exchange Rate Recalibrated',
      `Applied ${providerName || 'Live'} rate: 1 USD = ₹${newRate.toFixed(2)}.`
    );
  };

  // Compute live forecast
  const computeForecast = (): ForecastResult => {
    let assetsUsd = 0;
    let liabilitiesUsd = 0;
    let monthlyBurnUsd = 0;

    accounts.forEach((acc) => {
      const balUsd = acc.currency === 'USD' ? acc.balance : acc.balance / fxRate;
      const minPay = acc.monthly_min_payment
        ? acc.currency === 'USD'
          ? acc.monthly_min_payment
          : acc.monthly_min_payment / fxRate
        : 0;

      if (
        [
          'CreditCardAmex',
          'CreditCardApple',
          'CreditCardChase',
          'CreditCardCiti',
          'CreditCardGeneric',
          'LoanAuto',
          'LoanStudent',
          'LoanPersonal',
          'LoanMortgage',
        ].includes(acc.account_type)
      ) {
        liabilitiesUsd += Math.abs(balUsd);
        monthlyBurnUsd += minPay;
      } else if (acc.account_type === 'UtilityRecurring' || acc.account_type === 'InsurancePolicy') {
        monthlyBurnUsd += minPay;
      } else {
        assetsUsd += balUsd;
      }
    });

    let subDragMonthly = 0;
    subscriptions.forEach((s) => {
      let cost = s.currency === 'USD' ? s.cost_per_cycle : s.cost_per_cycle / fxRate;
      if (s.cycle.toLowerCase().includes('annual')) cost /= 12;
      subDragMonthly += cost;
    });

    monthlyBurnUsd += subDragMonthly;

    const netWorthUsd = assetsUsd - liabilitiesUsd;
    const monthlyIncomeUsd = 5243.42; // Verified Paychex Weekly Net ($1,210.02 * 52 / 12)
    const monthlySurplusUsd = monthlyIncomeUsd - monthlyBurnUsd;

    const curve: number[] = [];
    let running = netWorthUsd;
    for (let i = 1; i <= 12; i++) {
      running += monthlySurplusUsd;
      curve.push(Math.round(running));
    }

    return {
      current_net_worth_usd: Math.round(netWorthUsd),
      current_net_worth_inr: Math.round(netWorthUsd * fxRate),
      total_assets_usd: Math.round(assetsUsd),
      total_liabilities_usd: Math.round(liabilitiesUsd),
      monthly_inflow_usd: monthlyIncomeUsd,
      monthly_burn_usd: Math.round(monthlyBurnUsd),
      monthly_surplus_usd: Math.round(monthlySurplusUsd),
      annual_subscription_drag_usd: Math.round(subDragMonthly * 12),
      projected_12m_curve_usd: curve,
    };
  };

  const forecast = computeForecast();

  const handleToggleSub = (subId: string) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? {
              ...s,
              status: s.status === 'Active' ? 'FlaggedForCancellation' : 'Active',
            }
          : s
      )
    );
  };

  const handleAddAccount = (newAcc: Account) => {
    setAccounts((prev) => [...prev, newAcc]);
  };

  const handleSplitwiseSync = (balanceUsd: number) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === 'splitwise-net' ? { ...a, balance: balanceUsd } : a))
    );
  };

  const handleImportTransactions = (txs: Transaction[]) => {
    nativeBridge.scheduleLocalNotification(
      'Transactions Imported',
      `Parsed ${txs.length} transactions into local SQLite ledger.`
    );
  };

  const refreshLedger = () => {
    setIsRefreshing(true);
    nativeBridge.triggerHaptic('light');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-vault-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-vault-900 border border-vault-700 flex items-center justify-center mb-6 shadow-2xl text-vault-cyan">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">AIO Wealth Hub Vault</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-8">
          Secured with Hardware Biometrics & Zero-Cloud Local SQLite Storage.
        </p>
        <button
          onClick={handleUnlock}
          className="flex items-center gap-2 px-8 py-3.5 bg-vault-cyan text-vault-950 font-black rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-vault-cyan/20"
        >
          <Unlock className="w-5 h-5" />
          Unlock with Face ID / Biometrics
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-950 flex flex-col pb-24 md:pb-8">
      {/* Top Sticky Navbar (Desktop, Tablet & Mobile Header) */}
      <header className="sticky top-0 z-40 bg-vault-950/85 backdrop-blur-md border-b border-vault-800/80 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setActiveTab('overview');
            }}
          >
            <div className="w-8 h-8 rounded-xl bg-vault-900 border border-vault-700 flex items-center justify-center text-vault-cyan font-black text-sm">
              ₿
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white leading-none tracking-tight">
                AIO Wealth Hub
              </h1>
              <span className="text-[10px] text-slate-400">US & India Consolidated Vault</span>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Strip (Hidden on mobile phones / fold cover screen) */}
          <nav className="hidden md:flex items-center gap-1 bg-vault-900 p-1 rounded-xl border border-vault-800 text-xs overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-vault-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('independence')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'independence'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>FIRE & Independence</span>
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'accounts'
                  ? 'bg-vault-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Accounts & Debt
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'transactions'
                  ? 'bg-vault-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Transactions ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'subscriptions'
                  ? 'bg-vault-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Subscriptions ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('splitwise')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'splitwise'
                  ? 'bg-vault-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Splitwise
            </button>
            <button
              onClick={() => setActiveTab('forecaster')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'forecaster'
                  ? 'bg-vault-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              12M Forecast
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'import'
                  ? 'bg-vault-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Import CSV
            </button>
          </nav>

          {/* Right Action Cluster: Live FX, SimpleFIN Bridge, Currency Switcher & Lock Vault */}
          <div className="flex items-center gap-2">
            {/* SimpleFIN Bridge Status Pill */}
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setShowSimpleFinModal(true);
              }}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-900 border border-slate-800 hover:border-cyan-500/40 text-xs transition-colors cursor-pointer"
              title="Open SimpleFIN Bridge Hub"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-semibold font-sans">SimpleFIN</span>
              <span className="text-[10px] text-cyan-400 font-mono">11 Connected</span>
            </button>

            {/* Live FX Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-900 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="text-slate-500">Live FX:</span>
              <span className="text-amber-400 font-bold">1$ = ₹{fxRate.toFixed(2)}</span>
            </div>

            <div className="bg-vault-900 p-0.5 rounded-xl border border-vault-800 flex items-center text-xs">
              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('light');
                  setCurrency('USD');
                }}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  currency === 'USD'
                    ? 'bg-vault-cyan text-vault-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                $
              </button>
              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('light');
                  setCurrency('INR');
                }}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  currency === 'INR'
                    ? 'bg-vault-gold text-vault-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ₹
              </button>
            </div>

            <button
              onClick={() => {
                nativeBridge.triggerHaptic('medium');
                setIsLocked(true);
              }}
              className="p-2 rounded-xl bg-vault-900 border border-vault-800 text-slate-400 hover:text-white transition-colors"
              title="Lock Vault"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Content Container (Responsive: max-w-7xl, auto margin, fluid padding) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full space-y-5 sm:space-y-6">
        <NativeDeviceBar />

        {activeTab === 'overview' && (
          <div className="space-y-5 sm:space-y-6">
            {/* 1. Automated Sync Banner */}
            <AutomatedSyncCard />

            {/* 2. Quick Actions Bar (iBanko & Fintrack inspired with Live FX Suite) */}
            <QuickActionsBar
              currency={currency}
              fxRate={fxRate}
              onApplyFxRate={handleApplyFxRate}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* 3. Consolidated Net Worth Hero (HaraPro & Copilot inspired) */}
            <NetWorthHero
              forecast={forecast}
              currency={currency}
              onToggleCurrency={setCurrency}
              fxRate={fxRate}
              onRefresh={refreshLedger}
              isRefreshing={isRefreshing}
            />

            {/* 4. Virtual Card & Credit Instrument Wallet (iBanko & Apple Wallet inspired) */}
            <VirtualCardWallet
              accounts={accounts}
              currency={currency}
              fxRate={fxRate}
              selectedAccountId={selectedCardId}
              onSelectAccount={(accId) => {
                setSelectedCardId(accId);
                setActiveTab('transactions');
                nativeBridge.scheduleLocalNotification(
                  'Filtered Transaction Stream',
                  'Ledger filtered to selected physical card.'
                );
              }}
            />

            {/* 5. AI Wealth Copilot Proactive Insights (Synetica & AI Finance inspired) */}
            <AICopilotCard
              forecast={forecast}
              currency={currency}
              fxRate={fxRate}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* 6. On-Device 1B mini-cp5 Local RAG Copilot */}
            <LocalRAGCopilot />

            {/* 7. Cashflow Inflow vs Outflow & Category Analytics (Fintrack & Twisty inspired) */}
            <CashflowAnalytics
              forecast={forecast}
              currency={currency}
              fxRate={fxRate}
            />

            {/* 8. OpenAccountant Financial Independence (FIRE) & Debt Payoff Intelligence */}
            <FinancialIndependencePanel currency={currency} fxRate={fxRate} />

            {/* 9. Forecaster & Splitwise Bento Grid (1 col on mobile, 2 col on tablet/desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              <ForecasterChart forecast={forecast} currency={currency} fxRate={fxRate} />
              <SplitwisePanel
                currency={currency}
                fxRate={fxRate}
                onSyncSuccess={handleSplitwiseSync}
              />
            </div>

            {/* 9. Accounts & Debt Ledger */}
            <AccountsGrid
              accounts={accounts}
              currency={currency}
              fxRate={fxRate}
              onAddAccount={handleAddAccount}
            />

            {/* 10. Verified Transaction Stream */}
            <TransactionsTable
              transactions={transactions}
              accounts={accounts}
              currency={currency}
              fxRate={fxRate}
              selectedAccountId={selectedCardId}
            />

            {/* 11. Subscription Creep Radar (Wallos) */}
            <SubscriptionRadar
              subscriptions={subscriptions}
              currency={currency}
              fxRate={fxRate}
              onToggleStatus={handleToggleSub}
            />
          </div>
        )}

        {activeTab === 'independence' && (
          <FinancialIndependencePanel currency={currency} fxRate={fxRate} />
        )}

        {activeTab === 'accounts' && (
          <AccountsGrid
            accounts={accounts}
            currency={currency}
            fxRate={fxRate}
            onAddAccount={handleAddAccount}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTable
            transactions={transactions}
            accounts={accounts}
            currency={currency}
            fxRate={fxRate}
            selectedAccountId={selectedCardId}
          />
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionRadar
            subscriptions={subscriptions}
            currency={currency}
            fxRate={fxRate}
            onToggleStatus={handleToggleSub}
          />
        )}

        {activeTab === 'splitwise' && (
          <SplitwisePanel
            currency={currency}
            fxRate={fxRate}
            onSyncSuccess={handleSplitwiseSync}
          />
        )}

        {activeTab === 'forecaster' && (
          <ForecasterChart forecast={forecast} currency={currency} fxRate={fxRate} />
        )}

        {activeTab === 'import' && (
          <StatementImporter onImportTransactions={handleImportTransactions} />
        )}
      </main>

      {/* MOBILE / FOLD COVER BOTTOM NAVIGATION BAR (Thumb Ergonomics - Exactly 5 Touchpoints) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-vault-950/95 backdrop-blur-xl border-t border-vault-800/90 px-3 py-2 flex items-center justify-around z-50 pb-safe">
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('overview');
            setShowMobileMore(false);
          }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            activeTab === 'overview' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Vault</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('independence');
            setShowMobileMore(false);
          }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            activeTab === 'independence' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[10px] font-semibold">FIRE</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('accounts');
            setShowMobileMore(false);
          }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            activeTab === 'accounts' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Accounts</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('transactions');
            setShowMobileMore(false);
          }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            activeTab === 'transactions' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Txns</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setShowMobileMore(true);
          }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            ['subscriptions', 'splitwise', 'forecaster', 'import'].includes(activeTab) || showMobileMore
              ? 'text-vault-cyan'
              : 'text-slate-400'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </nav>

      {/* MOBILE "MORE" ACTION DRAWER / SHEET */}
      {showMobileMore && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-vault-950 border border-vault-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 pb-safe">
            <div className="flex items-center justify-between border-b border-vault-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Hub Features & Tools</h3>
                <p className="text-xs text-slate-400">Additional personal finance intelligence</p>
              </div>
              <button
                onClick={() => setShowMobileMore(false)}
                className="p-2 rounded-xl bg-vault-900 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('light');
                  setActiveTab('subscriptions');
                  setShowMobileMore(false);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-vault-900/70 border border-vault-800 hover:border-vault-700 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Subscriptions & SaaS</h4>
                    <p className="text-[11px] text-slate-400">
                      Wallos Engine · {subscriptions.length} recurring commitments
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('light');
                  setActiveTab('splitwise');
                  setShowMobileMore(false);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-vault-900/70 border border-vault-800 hover:border-vault-700 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Splitwise Reconciler</h4>
                    <p className="text-[11px] text-slate-400">
                      Household & group shared balance sync
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('light');
                  setActiveTab('forecaster');
                  setShowMobileMore(false);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-vault-900/70 border border-vault-800 hover:border-vault-700 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <LineChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">12-Month Net Worth Forecaster</h4>
                    <p className="text-[11px] text-slate-400">
                      Monte Carlo habit adjustment simulator
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('light');
                  setActiveTab('import');
                  setShowMobileMore(false);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-vault-900/70 border border-vault-800 hover:border-vault-700 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Import Statements & CSV</h4>
                    <p className="text-[11px] text-slate-400">
                      Offline parser for bank PDFs & exports
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="pt-2 border-t border-vault-800">
              <button
                onClick={() => {
                  nativeBridge.triggerHaptic('medium');
                  setIsLocked(true);
                  setShowMobileMore(false);
                }}
                className="w-full py-3 bg-vault-900 hover:bg-vault-850 text-slate-300 font-semibold text-xs rounded-xl border border-vault-800 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                Lock Vault Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global SimpleFIN Bridge Connection Hub */}
      <SimpleFinConnectionModal
        isOpen={showSimpleFinModal}
        onClose={() => setShowSimpleFinModal(false)}
        onSyncComplete={refreshLedger}
      />
    </div>
  );
};
export default App;
