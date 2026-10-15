import React, { useState } from 'react';
import { Currency, Transaction } from '../types';
import { Search, ArrowDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: Currency;
  fxRate: number;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  currency,
  fxRate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All Transactions' },
    { id: 'Income', label: 'Income:Salary' },
    { id: 'Debt', label: 'Debt (Auto / Mortgage)' },
    { id: 'Utility', label: 'Expense:Utility' },
    { id: 'Insurance', label: 'Expense:Insurance' },
  ];

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'ALL' ||
      tx.category.toLowerCase().startsWith(categoryFilter.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const formatAmount = (amt: number, txCurr: Currency) => {
    const absAmt = Math.abs(amt);
    let finalAmt = absAmt;
    if (currency === 'USD' && txCurr === 'INR') {
      finalAmt = absAmt / fxRate;
    } else if (currency === 'INR' && txCurr === 'USD') {
      finalAmt = absAmt * fxRate;
    }

    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${finalAmt.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCategoryBadge = (cat: string) => {
    if (cat.startsWith('Income')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (cat.startsWith('Debt')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (cat.includes('Utility')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (cat.includes('Insurance')) {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="bg-vault-900 border border-vault-800 rounded-3xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Verified Ledger Transactions</h2>
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
              <Sparkles className="w-3 h-3" />
              Jev LLM Bounded Classification
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic Chart of Accounts tagging from Paychex payroll, bank alerts & statements.
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-vault-950 px-3 py-1.5 rounded-xl border border-vault-800">
          Showing <span className="font-bold text-white">{filtered.length}</span> of {transactions.length} records
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search merchant, date, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-vault-950 border border-vault-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`text-xs px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                categoryFilter === c.id
                  ? 'bg-vault-800 text-cyan-400 font-bold border border-vault-700'
                  : 'bg-vault-950 text-slate-400 hover:text-white border border-vault-800/60'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-vault-800/80 bg-vault-950/50">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-vault-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-vault-800">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Merchant / Counterparty</th>
              <th className="py-3 px-4">Category (Jev COA)</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4 hidden md:table-cell">Audit Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vault-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No transactions match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isIncome = tx.category.startsWith('Income');
                return (
                  <tr key={tx.id} className="hover:bg-vault-900/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        {isIncome ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span>{tx.merchant}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Account: {tx.account_id}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${getCategoryBadge(
                          tx.category
                        )}`}
                      >
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                      <span className={isIncome ? 'text-emerald-400' : 'text-slate-200'}>
                        {isIncome ? '+' : '-'}{formatAmount(tx.amount, tx.currency)}
                      </span>
                      {currency !== tx.currency && (
                        <span className="block text-[10px] text-slate-500 font-normal">
                          orig: {tx.currency === 'USD' ? '$' : '₹'}{Math.abs(tx.amount).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-400 text-[11px] max-w-xs truncate">
                      {tx.notes || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
