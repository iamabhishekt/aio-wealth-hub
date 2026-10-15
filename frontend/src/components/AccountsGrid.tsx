import React, { useState } from 'react';
import { Account, AccountType, Currency } from '../types';
import { Landmark, CreditCard, Car, GraduationCap, Building, Plus } from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface Props {
  accounts: Account[];
  currency: Currency;
  fxRate: number;
  onAddAccount: (acc: Account) => void;
}

export const AccountsGrid: React.FC<Props> = ({ accounts, currency, fxRate, onAddAccount }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'us' | 'india'>('all');

  // Form state
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('CashChecking');
  const [accCurrency, setAccCurrency] = useState<Currency>('USD');
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [institution, setInstitution] = useState('');

  const formatAccountMoney = (amt: number, originalCur: Currency) => {
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

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'CreditCardAmex':
      case 'CreditCardApple':
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'LoanAuto':
        return <Car className="w-4 h-4 text-rose-400" />;
      case 'LoanStudent':
      case 'LoanPersonal':
      case 'LoanMortgage':
        return <GraduationCap className="w-4 h-4 text-purple-400" />;
      case 'IndianLICPolicy':
      case 'IndianPPF':
      case 'IndianEPF':
        return <Building className="w-4 h-4 text-emerald-400" />;
      default:
        return <Landmark className="w-4 h-4 text-vault-cyan" />;
    }
  };

  const isDebt = (type: AccountType) => {
    return [
      'CreditCardAmex',
      'CreditCardApple',
      'LoanAuto',
      'LoanStudent',
      'LoanPersonal',
      'LoanMortgage',
    ].includes(type);
  };

  const filteredAccounts = accounts.filter((a) => {
    if (filter === 'us') return a.currency === 'USD';
    if (filter === 'india') return a.currency === 'INR';
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
    // Reset form
    setName('');
    setBalance('');
    setApr('');
    setMinPayment('');
    setInstitution('');
  };

  return (
    <div className="space-y-4">
      {/* Title & Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Accounts, Cards & Liabilities
            <span className="text-xs px-2 py-0.5 rounded-full bg-vault-700 text-slate-300">
              {accounts.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time balance across US Banking, Apple Card, Amex, Indian Mutual Funds & LIC
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-vault-900 border border-vault-700 p-1 rounded-xl text-xs flex">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg ${filter === 'all' ? 'bg-vault-700 text-white' : 'text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('us')}
              className={`px-2.5 py-1 rounded-lg ${filter === 'us' ? 'bg-vault-700 text-white' : 'text-slate-400'}`}
            >
              🇺🇸 US
            </button>
            <button
              onClick={() => setFilter('india')}
              className={`px-2.5 py-1 rounded-lg ${filter === 'india' ? 'bg-vault-700 text-white' : 'text-slate-400'}`}
            >
              🇮🇳 India
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-cyan text-vault-950 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredAccounts.map((acc) => {
          const debt = isDebt(acc.account_type);
          return (
            <div
              key={acc.id}
              className="p-4 rounded-xl bg-vault-900 border border-vault-800 hover:border-vault-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-vault-950 border border-vault-800">
                      {getAccountIcon(acc.account_type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-tight">
                        {acc.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">{acc.institution}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    acc.currency === 'USD' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {acc.currency}
                  </span>
                </div>

                <div className="mt-3">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                    {debt ? 'Outstanding Debt' : 'Current Value / Balance'}
                  </span>
                  <div className={`text-xl font-bold ${debt ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatAccountMoney(acc.balance, acc.currency)}
                  </div>
                </div>
              </div>

              {/* APR & Minimum Payment info */}
              {(acc.apr || acc.monthly_min_payment) && (
                <div className="mt-3 pt-3 border-t border-vault-800 flex items-center justify-between text-xs text-slate-400">
                  {acc.apr ? <span>APR: <strong className="text-slate-200">{acc.apr}%</strong></span> : <span />}
                  {acc.monthly_min_payment ? (
                    <span>Min Pay: <strong className="text-slate-200">{formatAccountMoney(acc.monthly_min_payment, acc.currency)}/mo</strong></span>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-vault-900 border border-vault-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Connect / Register Account</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Account Label</label>
                <input
                  type="text"
                  placeholder="e.g. Chase Sapphire, LIC Policy, HDFC MF"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-vault-950 border border-vault-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-vault-cyan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full bg-vault-950 border border-vault-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-vault-cyan"
                  >
                    <option value="CashChecking">Cash Checking</option>
                    <option value="CashSavings">Cash Savings</option>
                    <option value="CreditCardApple">Apple Card</option>
                    <option value="CreditCardAmex">Amex Card</option>
                    <option value="LoanAuto">Auto Loan</option>
                    <option value="LoanStudent">Student Loan</option>
                    <option value="InvestmentMutualFund">Mutual Fund (India e-CAS)</option>
                    <option value="IndianLICPolicy">Indian LIC Policy</option>
                    <option value="IndianPPF">Indian PPF / EPF</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Currency</label>
                  <select
                    value={accCurrency}
                    onChange={(e) => setAccCurrency(e.target.value as Currency)}
                    className="w-full bg-vault-950 border border-vault-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-vault-cyan"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Balance / Debt</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full bg-vault-950 border border-vault-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-vault-cyan"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">APR % (if loan/card)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 19.99"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    className="w-full bg-vault-950 border border-vault-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-vault-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Institution</label>
                <input
                  type="text"
                  placeholder="e.g. Goldman Sachs, LIC of India, SBI"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-vault-950 border border-vault-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-vault-cyan"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-vault-cyan text-vault-950 font-bold text-xs rounded-xl hover:opacity-90"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
