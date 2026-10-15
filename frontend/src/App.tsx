import React, { useState, useEffect } from 'react';
import { Account, Currency, ForecastResult, Subscription, Transaction } from './types';
import { NetWorthHero } from './components/NetWorthHero';
import { AccountsGrid } from './components/AccountsGrid';
import { SubscriptionRadar } from './components/SubscriptionRadar';
import { SplitwisePanel } from './components/SplitwisePanel';
import { ForecasterChart } from './components/ForecasterChart';
import { StatementImporter } from './components/StatementImporter';
import { NativeDeviceBar } from './components/NativeDeviceBar';
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
} from 'lucide-react';

const DEFAULT_FX_RATE = 86.5;

export const App: React.FC = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'accounts' | 'subscriptions' | 'splitwise' | 'forecaster' | 'import'
  >('overview');

  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: 'us-chase-chk',
      name: 'Chase Total Checking',
      account_type: 'CashChecking',
      currency: 'USD',
      balance: 5400,
      apr: null,
      monthly_min_payment: null,
      institution: 'Chase Bank',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'us-apple-card',
      name: 'Apple Card (Titanium)',
      account_type: 'CreditCardApple',
      currency: 'USD',
      balance: 1250,
      apr: 19.24,
      monthly_min_payment: 125,
      institution: 'Goldman Sachs',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'us-amex-card',
      name: 'Amex Everyday Preferred',
      account_type: 'CreditCardAmex',
      currency: 'USD',
      balance: 840,
      apr: 21.99,
      monthly_min_payment: 85,
      institution: 'American Express',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'us-auto-loan',
      name: 'Auto Loan',
      account_type: 'LoanAuto',
      currency: 'USD',
      balance: 18500,
      apr: 4.8,
      monthly_min_payment: 380,
      institution: 'Capital One Auto',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'in-mf-nifty',
      name: 'Nippon India Nifty 50 Index',
      account_type: 'InvestmentMutualFund',
      currency: 'INR',
      balance: 450000,
      apr: null,
      monthly_min_payment: null,
      institution: 'CAMS e-CAS',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'in-lic-jeevan',
      name: 'LIC Jeevan Anand #88349210',
      account_type: 'IndianLICPolicy',
      currency: 'INR',
      balance: 1000000,
      apr: null,
      monthly_min_payment: 4000,
      institution: 'LIC of India',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'splitwise-net',
      name: 'Splitwise Net Balance',
      account_type: 'SplitwiseNetBalance',
      currency: 'USD',
      balance: 145.5,
      apr: null,
      monthly_min_payment: null,
      institution: 'Splitwise',
      updated_at: new Date().toISOString(),
    },
  ]);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    {
      id: 'sub-google-one',
      service_name: 'Google One 2TB',
      source: 'Google Play',
      cost_per_cycle: 9.99,
      currency: 'USD',
      cycle: 'Monthly',
      next_renewal: '2026-11-01',
      status: 'Active',
    },
    {
      id: 'sub-apple-music',
      service_name: 'Apple Music Family',
      source: 'Apple App Store',
      cost_per_cycle: 16.99,
      currency: 'USD',
      cycle: 'Monthly',
      next_renewal: '2026-10-28',
      status: 'Active',
    },
    {
      id: 'sub-prime',
      service_name: 'Amazon Prime',
      source: 'Direct',
      cost_per_cycle: 139.0,
      currency: 'USD',
      cycle: 'Annual',
      next_renewal: '2027-02-15',
      status: 'Active',
    },
    {
      id: 'sub-gym',
      service_name: 'Unused Gym Trial',
      source: 'Google Play',
      cost_per_cycle: 29.99,
      currency: 'USD',
      cycle: 'Monthly',
      next_renewal: '2026-10-20',
      status: 'FlaggedForCancellation',
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial biometrics unlock attempt
  useEffect(() => {
    // Attempt biometric unlock on app mount
    nativeBridge.authenticateBiometrics().then((success) => {
      if (success) {
        setIsLocked(false);
      }
    });
  }, []);

  const handleUnlock = async () => {
    nativeBridge.triggerHaptic('medium');
    const ok = await nativeBridge.authenticateBiometrics();
    if (ok) {
      nativeBridge.triggerHaptic('success');
      setIsLocked(false);
    }
  };

  // Compute live forecast
  const computeForecast = (): ForecastResult => {
    let assetsUsd = 0;
    let liabilitiesUsd = 0;
    let monthlyBurnUsd = 0;

    accounts.forEach((acc) => {
      const balUsd = acc.currency === 'USD' ? acc.balance : acc.balance / DEFAULT_FX_RATE;
      const minPay = acc.monthly_min_payment
        ? acc.currency === 'USD'
          ? acc.monthly_min_payment
          : acc.monthly_min_payment / DEFAULT_FX_RATE
        : 0;

      if (
        [
          'CreditCardAmex',
          'CreditCardApple',
          'LoanAuto',
          'LoanStudent',
          'LoanPersonal',
          'LoanMortgage',
        ].includes(acc.account_type)
      ) {
        liabilitiesUsd += Math.abs(balUsd);
        monthlyBurnUsd += minPay;
      } else {
        assetsUsd += balUsd;
      }
    });

    let subDragMonthly = 0;
    subscriptions.forEach((s) => {
      let cost = s.currency === 'USD' ? s.cost_per_cycle : s.cost_per_cycle / DEFAULT_FX_RATE;
      if (s.cycle.toLowerCase().includes('annual')) cost /= 12;
      subDragMonthly += cost;
    });

    monthlyBurnUsd += subDragMonthly;

    const netWorthUsd = assetsUsd - liabilitiesUsd;
    const monthlyIncomeUsd = 6500;
    const monthlySurplusUsd = monthlyIncomeUsd - monthlyBurnUsd;

    const curve: number[] = [];
    let running = netWorthUsd;
    for (let i = 1; i <= 12; i++) {
      running += monthlySurplusUsd;
      curve.push(Math.round(running));
    }

    return {
      current_net_worth_usd: Math.round(netWorthUsd),
      current_net_worth_inr: Math.round(netWorthUsd * DEFAULT_FX_RATE),
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
    <div className="min-h-screen bg-vault-950 flex flex-col pb-20 sm:pb-8">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-vault-950/80 backdrop-blur-md border-b border-vault-800/80 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-vault-900 border border-vault-700 flex items-center justify-center text-vault-cyan font-black">
              ₿
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white leading-none">AIO Wealth Hub</h1>
              <span className="text-[10px] text-slate-400">US & India Consolidated Vault</span>
            </div>
          </div>

          {/* Desktop Tab Switcher */}
          <nav className="hidden md:flex items-center gap-1 bg-vault-900 p-1 rounded-xl border border-vault-800 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'overview' ? 'bg-vault-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'accounts' ? 'bg-vault-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Accounts & Debt
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'subscriptions' ? 'bg-vault-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('splitwise')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'splitwise' ? 'bg-vault-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Splitwise
            </button>
            <button
              onClick={() => setActiveTab('forecaster')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'forecaster' ? 'bg-vault-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              12M Forecast
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'import' ? 'bg-vault-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Import CSV
            </button>
          </nav>

          <button
            onClick={() => setIsLocked(true)}
            className="p-2 rounded-xl bg-vault-900 border border-vault-800 text-slate-400 hover:text-white transition-colors"
            title="Lock Vault"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex-1 w-full space-y-6">
        <NativeDeviceBar />

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <NetWorthHero
              forecast={forecast}
              currency={currency}
              onToggleCurrency={setCurrency}
              fxRate={DEFAULT_FX_RATE}
              onRefresh={refreshLedger}
              isRefreshing={isRefreshing}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ForecasterChart
                forecast={forecast}
                currency={currency}
                fxRate={DEFAULT_FX_RATE}
              />
              <SplitwisePanel
                currency={currency}
                fxRate={DEFAULT_FX_RATE}
                onSyncSuccess={handleSplitwiseSync}
              />
            </div>

            <AccountsGrid
              accounts={accounts}
              currency={currency}
              fxRate={DEFAULT_FX_RATE}
              onAddAccount={handleAddAccount}
            />

            <SubscriptionRadar
              subscriptions={subscriptions}
              currency={currency}
              fxRate={DEFAULT_FX_RATE}
              onToggleStatus={handleToggleSub}
            />
          </div>
        )}

        {activeTab === 'accounts' && (
          <AccountsGrid
            accounts={accounts}
            currency={currency}
            fxRate={DEFAULT_FX_RATE}
            onAddAccount={handleAddAccount}
          />
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionRadar
            subscriptions={subscriptions}
            currency={currency}
            fxRate={DEFAULT_FX_RATE}
            onToggleStatus={handleToggleSub}
          />
        )}

        {activeTab === 'splitwise' && (
          <SplitwisePanel
            currency={currency}
            fxRate={DEFAULT_FX_RATE}
            onSyncSuccess={handleSplitwiseSync}
          />
        )}

        {activeTab === 'forecaster' && (
          <ForecasterChart
            forecast={forecast}
            currency={currency}
            fxRate={DEFAULT_FX_RATE}
          />
        )}

        {activeTab === 'import' && (
          <StatementImporter
            onImportTransactions={handleImportTransactions}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (iOS / Android Native feel) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-vault-950/95 backdrop-blur-lg border-t border-vault-800 px-2 py-2 flex items-center justify-around z-50">
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('overview');
          }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${
            activeTab === 'overview' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Vault</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('accounts');
          }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${
            activeTab === 'accounts' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Accounts</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('subscriptions');
          }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${
            activeTab === 'subscriptions' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <Repeat className="w-5 h-5" />
          <span className="text-[10px] font-medium">Subs</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('splitwise');
          }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${
            activeTab === 'splitwise' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Splitwise</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('forecaster');
          }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${
            activeTab === 'forecaster' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <LineChart className="w-5 h-5" />
          <span className="text-[10px] font-medium">12M Forecaster</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('import');
          }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${
            activeTab === 'import' ? 'text-vault-cyan' : 'text-slate-400'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] font-medium">Import</span>
        </button>
      </nav>
    </div>
  );
};
export default App;
