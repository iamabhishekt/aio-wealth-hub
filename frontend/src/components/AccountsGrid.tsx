import React, { useState } from 'react';
import { Account, AccountType, Currency } from '../types';
import {
  Landmark,
  CreditCard,
  Car,
  Building,
  Plus,
  Shield,
  Zap,
  TrendingUp,
  ArrowRightLeft,
  AlertTriangle,
  Globe,
  PiggyBank,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  accounts: Account[];
  currency: Currency;
  fxRate: number;
  onAddAccount: (acc: Account) => void;
}

type SkillCategory = 'all' | 'assets' | 'debts' | 'remittances' | 'us' | 'india';

export const AccountsGrid: React.FC<Props> = ({ accounts, currency, fxRate, onAddAccount }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [skillCategory, setSkillCategory] = useState<SkillCategory>('all');

  // Form state
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('CashChecking');
  const [accCurrency, setAccCurrency] = useState<Currency>('USD');
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [institution, setInstitution] = useState('');

  const isDebt = (type: AccountType) => {
    return [
      'CreditCardAmex',
      'CreditCardApple',
      'CreditCardChase',
      'CreditCardCiti',
      'CreditCardGeneric',
      'LoanAuto',
      'LoanStudent',
      'LoanPersonal',
      'LoanMortgage',
    ].includes(type);
  };

  const isAsset = (type: AccountType) => {
    return [
      'CashChecking',
      'CashSavings',
      'InvestmentStock',
      'InvestmentMutualFund',
      'InvestmentCrypto',
      'Investment401k',
      'IndianPPF',
      'IndianEPF',
      'SplitwiseNetBalance',
    ].includes(type);
  };

  const formatConvertedMoney = (amt: number, originalCur: Currency) => {
    let converted = amt;
    if (currency === 'USD' && originalCur === 'INR') {
      converted = amt / fxRate;
    } else if (currency === 'INR' && originalCur === 'USD') {
      converted = amt * fxRate;
    }

    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  const formatOriginalMoney = (amt: number, originalCur: Currency) => {
    return new Intl.NumberFormat(originalCur === 'USD' ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency: originalCur,
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'CreditCardAmex':
      case 'CreditCardApple':
      case 'CreditCardChase':
      case 'CreditCardCiti':
      case 'CreditCardGeneric':
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'LoanAuto':
        return <Car className="w-4 h-4 text-rose-400" />;
      case 'LoanMortgage':
        return <Building className="w-4 h-4 text-purple-400" />;
      case 'InvestmentStock':
      case 'InvestmentMutualFund':
      case 'InvestmentCrypto':
      case 'Investment401k':
        return <TrendingUp className="w-4 h-4 text-cyan-400" />;
      case 'IndianLICPolicy':
      case 'IndianPPF':
      case 'IndianEPF':
        return <Building className="w-4 h-4 text-emerald-400" />;
      case 'InsurancePolicy':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'UtilityRecurring':
        return <Zap className="w-4 h-4 text-amber-300" />;
      default:
        return <Landmark className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getSkillBadge = (acc: Account) => {
    if (acc.id === 'in-hdfc-loan-703795941') {
      return {
        tag: '#debt-payoff:mortgage',
        color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        label: 'Priority 4 (8.5% Secured)',
      };
    }
    if (acc.name.includes('Citi')) {
      return {
        tag: '#debt-payoff:avalanche-1',
        color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        label: 'Priority 1 (21.0% Critical)',
      };
    }
    if (acc.name.includes('Sapphire')) {
      return {
        tag: '#debt-payoff:avalanche-2',
        color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        label: 'Priority 2 (21.0% Critical)',
      };
    }
    if (acc.name.includes('Platinum Card')) {
      return {
        tag: '#debt-payoff:avalanche-3',
        color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        label: 'Priority 3 (21.0% Critical)',
      };
    }
    if (acc.name.includes('TOYOTA')) {
      return {
        tag: '#debt-payoff:auto-loan',
        color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        label: 'Priority 5 (5.99% Fixed)',
      };
    }
    if (acc.account_type === 'CashChecking' || acc.account_type === 'CashSavings') {
      return {
        tag: '#emergency-fund',
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        label: 'Liquid Reserve',
      };
    }
    if (acc.account_type.startsWith('Investment')) {
      return {
        tag: '#net-worth:wealth',
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        label: 'Growth Asset',
      };
    }
    return {
      tag: '#general',
      color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      label: 'Verified Ledger',
    };
  };

  const filteredAccounts = accounts.filter((a) => {
    if (skillCategory === 'assets') return isAsset(a.account_type);
    if (skillCategory === 'debts') return isDebt(a.account_type);
    if (skillCategory === 'us') return a.currency === 'USD';
    if (skillCategory === 'india') return a.currency === 'INR';
    return true;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;

    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      name,
      account_type: accountType,
      currency: accCurrency,
      balance: parseFloat(balance) || 0,
      apr: apr ? parseFloat(apr) : null,
      monthly_min_payment: minPayment ? parseFloat(minPayment) : null,
      institution: institution || 'Self Registered',
      updated_at: new Date().toISOString(),
    };

    nativeBridge.triggerHaptic('success');
    onAddAccount(newAcc);
    setShowAddModal(false);
    setName('');
    setBalance('');
    setApr('');
    setMinPayment('');
    setInstitution('');
  };

  // Aggregates for skills
  const assetCount = accounts.filter((a) => isAsset(a.account_type)).length;
  const debtCount = accounts.filter((a) => isDebt(a.account_type)).length;

  return (
    <div className="space-y-6">
      {/* Title & Financial Skills Categorization Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-vault-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Accounts, Debt & Cross-Border Ledgers
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-vault-800 border border-vault-700 text-slate-300 font-semibold">
              {accounts.length} active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Categorized according to OpenAccountant skills: Liquid Reserves, Avalanche Debt Payoff, and Cross-Border Transfers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Skill Category Filter Pills */}
          <div className="bg-vault-900 border border-vault-800 p-1 rounded-2xl text-xs flex flex-wrap gap-1">
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setSkillCategory('all');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
                skillCategory === 'all' ? 'bg-vault-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setSkillCategory('assets');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
                skillCategory === 'assets'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assets & Cash ({assetCount})</span>
            </button>
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setSkillCategory('debts');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
                skillCategory === 'debts'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Debts & Loans ({debtCount})</span>
            </button>
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setSkillCategory('remittances');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
                skillCategory === 'remittances'
                  ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>Cross-Border (Remitly & Crobo)</span>
            </button>
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setSkillCategory('india');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
                skillCategory === 'india'
                  ? 'bg-vault-800 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇮🇳 India (HDFC & SBI)
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-vault-cyan text-vault-950 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Connect Account
          </button>
        </div>
      </div>

      {/* Remittance Pipeline Spotlight (Shown when remittances filter is active or in overview) */}
      {skillCategory === 'remittances' && (
        <div className="bg-gradient-to-r from-blue-950/60 via-vault-900/80 to-purple-950/60 border border-blue-500/30 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cross-Border Remittance Pipeline</h3>
                <p className="text-xs text-slate-400">
                  US Checking ($) ➔ Remitly & Crobo.money ➔ SBI Savings (₹) ➔ HDFC Home Loan Servicing (₹)
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Live FX: 1 USD = {fxRate} INR
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-vault-950/60 border border-vault-800">
              <span className="text-[11px] text-slate-400">Total USD Dispatched</span>
              <div className="text-xl font-bold font-mono text-white mt-0.5">$9,924.49 USD</div>
              <p className="text-[10px] text-slate-500 mt-1">From Chase & Direct Deposit</p>
            </div>
            <div className="p-4 rounded-2xl bg-vault-950/60 border border-vault-800">
              <span className="text-[11px] text-slate-400">Total INR Landed in India</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">₹9,45,000+ INR</div>
              <p className="text-[10px] text-slate-500 mt-1">Deposited into SBI & HDFC Loan</p>
            </div>
            <div className="p-4 rounded-2xl bg-vault-950/60 border border-vault-800">
              <span className="text-[11px] text-slate-400">Active Gateways</span>
              <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">
                  Remitly
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs">
                  Crobo.money
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">Direct to Bank ACH / UPI</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((acc) => {
          const debt = isDebt(acc.account_type);
          const skill = getSkillBadge(acc);

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl bg-vault-950/80 border transition-all flex flex-col justify-between relative overflow-hidden backdrop-blur-xl ${
                debt ? 'border-vault-800 hover:border-rose-500/40' : 'border-vault-800 hover:border-emerald-500/40'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-vault-900 border border-vault-800">
                      {getAccountIcon(acc.account_type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {acc.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{acc.institution}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      acc.currency === 'USD'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {acc.currency}
                  </span>
                </div>

                {/* OpenAccountant Skill Tag */}
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${skill.color}`}>
                    {skill.label}
                  </span>
                </div>

                {/* Primary Converted Balance */}
                <div className="mt-2">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                    {debt ? 'Outstanding Liability' : 'Current Value / Reserve'}
                  </span>
                  <div className={`text-2xl font-extrabold font-mono mt-0.5 ${debt ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatConvertedMoney(acc.balance, acc.currency)}
                  </div>

                  {/* Native Currency Subtitle (Antislop Precision) */}
                  {currency !== acc.currency && (
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      Native: <span className="text-slate-300 font-semibold">{formatOriginalMoney(acc.balance, acc.currency)}</span>
                      <span className="text-slate-500 ml-1.5">(@ {fxRate} INR/USD)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* APR & Monthly Servicing */}
              {(acc.apr || acc.monthly_min_payment) && (
                <div className="mt-4 pt-3 border-t border-vault-800/80 flex items-center justify-between text-xs text-slate-400">
                  {acc.apr ? (
                    <span>
                      APR: <strong className={acc.apr >= 20 ? 'text-rose-400' : 'text-slate-200'}>{acc.apr}%</strong>
                    </span>
                  ) : (
                    <span />
                  )}
                  {acc.monthly_min_payment ? (
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500">Min Payment</span>
                      <strong className="text-slate-200 font-mono">
                        {formatConvertedMoney(acc.monthly_min_payment, acc.currency)}/mo
                      </strong>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-vault-950 border border-vault-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Connect / Register Account</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Account Label</label>
                <input
                  type="text"
                  placeholder="e.g. Chase Sapphire, HDFC Home Loan, SBI Savings"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CashChecking">Cash Checking</option>
                    <option value="CashSavings">Cash Savings</option>
                    <option value="CreditCardGeneric">Credit Card</option>
                    <option value="LoanAuto">Auto Loan</option>
                    <option value="LoanMortgage">Mortgage Loan</option>
                    <option value="InvestmentStock">Brokerage / Stocks</option>
                    <option value="Investment401k">401(k) Retirement</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Currency</label>
                  <select
                    value={accCurrency}
                    onChange={(e) => setAccCurrency(e.target.value as Currency)}
                    className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Balance</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">APR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 21.0"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Institution</label>
                <input
                  type="text"
                  placeholder="e.g. Chase, HDFC Bank, SBI, Robinhood"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-vault-900 text-slate-300 rounded-xl text-xs hover:bg-vault-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-vault-cyan text-vault-950 font-bold rounded-xl text-xs hover:opacity-90"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
