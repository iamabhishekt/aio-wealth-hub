import React, { useState, useMemo } from 'react';
import { Account, Currency, Transaction } from '../types';
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Zap,
  Briefcase,
  FileText,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

interface TransactionsTableProps {
  transactions: Transaction[];
  accounts: Account[];
  currency: Currency;
  fxRate: number;
}

type SourceFilter = 'ALL' | 'API_ONLY' | 'BANK_API' | 'PAYROLL_API' | 'PDF_STATEMENT';
type FlowFilter = 'ALL' | 'INFLOW' | 'OUTFLOW';
type TimeFilter = 'ALL' | '30D' | '90D' | '1Y';

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  accounts,
  currency,
  fxRate,
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('API_ONLY');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [flowFilter, setFlowFilter] = useState<FlowFilter>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Map account IDs to friendly names and institutions
  const accountMap = useMemo(() => {
    const map = new Map<string, { name: string; institution: string }>();
    accounts.forEach((acc) => {
      map.set(acc.id, { name: acc.name, institution: acc.institution });
    });
    return map;
  }, [accounts]);

  const getFriendlyAccountInfo = (accountId: string) => {
    if (accountMap.has(accountId)) {
      return accountMap.get(accountId)!;
    }

    // Specific alert / statement mappings
    if (accountId.includes('toyota_alert')) {
      return { name: 'Toyota Financial Auto Loan', institution: 'Toyota e-Statement PDF' };
    }
    if (accountId.includes('verizon_alert')) {
      return { name: 'Verizon Fios Home Internet', institution: 'Verizon e-Bill PDF' };
    }
    if (accountId.includes('progressive_alert')) {
      return { name: 'Progressive Auto Insurance', institution: 'Progressive e-Policy PDF' };
    }
    if (accountId.includes('jio_alert')) {
      return { name: 'Jio Mobile Telecom (India)', institution: 'Jio e-Bill PDF' };
    }
    if (accountId.includes('chase_alert')) {
      return { name: 'Chase Alert Service', institution: 'Chase Email Alert' };
    }
    if (accountId === 'us-checking-609') {
      return { name: 'Direct Deposit Checking (609)', institution: 'Payroll Checking' };
    }
    if (accountId === 'in-sbi-savings-6073') {
      return { name: 'SBI Savings Account (***6073)', institution: 'State Bank of India' };
    }
    if (accountId === 'in-hdfc-loan-703795941') {
      return { name: 'HDFC NRI Home Loan', institution: 'HDFC Bank' };
    }

    if (accountId.startsWith('ACT-')) {
      return { name: `Bank Feed (${accountId.slice(0, 12)}...)`, institution: 'Financial Institution' };
    }

    return { name: accountId, institution: 'Verified Source' };
  };

  const getSourceType = (tx: Transaction): 'BANK_API' | 'PAYROLL_API' | 'PDF_STATEMENT' | 'OTHER' => {
    if (tx.id.startsWith('TRN-')) return 'BANK_API';
    if (tx.id.startsWith('paychex-')) return 'PAYROLL_API';
    if (tx.id.includes('_alert_')) return 'PDF_STATEMENT';
    return 'OTHER';
  };

  // Distinct categories available in current transactions
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => set.add(tx.category));
    return Array.from(set).sort();
  }, [transactions]);

  // Distinct accounts available in transactions
  const availableAccountIds = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => set.add(tx.account_id));
    return Array.from(set);
  }, [transactions]);

  // Filtered dataset
  const filtered = useMemo(() => {
    const now = new Date('2026-10-15T00:00:00Z').getTime();

    return transactions.filter((tx) => {
      const src = getSourceType(tx);

      // 1. Source filter
      if (sourceFilter === 'API_ONLY') {
        if (src !== 'BANK_API' && src !== 'PAYROLL_API') return false;
      } else if (sourceFilter === 'BANK_API') {
        if (src !== 'BANK_API') return false;
      } else if (sourceFilter === 'PAYROLL_API') {
        if (src !== 'PAYROLL_API') return false;
      } else if (sourceFilter === 'PDF_STATEMENT') {
        if (src !== 'PDF_STATEMENT') return false;
      }

      // 2. Category filter
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) {
        return false;
      }

      // 3. Account filter
      if (accountFilter !== 'ALL' && tx.account_id !== accountFilter) {
        return false;
      }

      // 4. Flow filter
      const isIncome =
        tx.category.startsWith('Income') ||
        (!tx.category.startsWith('Expense') && !tx.category.startsWith('Debt') && tx.category.toLowerCase().includes('salary'));

      if (flowFilter === 'INFLOW' && !isIncome) return false;
      if (flowFilter === 'OUTFLOW' && isIncome) return false;

      // 5. Time filter
      if (timeFilter !== 'ALL') {
        const txTime = new Date(tx.date).getTime();
        const diffDays = (now - txTime) / (1000 * 60 * 60 * 24);
        if (timeFilter === '30D' && diffDays > 30) return false;
        if (timeFilter === '90D' && diffDays > 90) return false;
        if (timeFilter === '1Y' && diffDays > 365) return false;
      }

      // 6. Text search
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const accInfo = getFriendlyAccountInfo(tx.account_id);
        const match =
          tx.merchant.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.date.toLowerCase().includes(q) ||
          (tx.notes && tx.notes.toLowerCase().includes(q)) ||
          accInfo.name.toLowerCase().includes(q) ||
          accInfo.institution.toLowerCase().includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [transactions, sourceFilter, categoryFilter, accountFilter, flowFilter, timeFilter, searchTerm, accountMap]);

  // Aggregate stats over filtered records
  const stats = useMemo(() => {
    let inflow = 0;
    let outflow = 0;

    filtered.forEach((tx) => {
      const isIncome =
        tx.category.startsWith('Income') ||
        (!tx.category.startsWith('Expense') && !tx.category.startsWith('Debt') && tx.category.toLowerCase().includes('salary'));

      const absAmt = Math.abs(tx.amount);
      const valUsd = tx.currency === 'USD' ? absAmt : absAmt / fxRate;

      if (isIncome) {
        inflow += valUsd;
      } else {
        outflow += valUsd;
      }
    });

    return {
      count: filtered.length,
      inflow,
      outflow,
      net: inflow - outflow,
    };
  }, [filtered, fxRate]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const resetFilters = () => {
    nativeBridge.triggerHaptic('medium');
    setSearchTerm('');
    setSourceFilter('ALL');
    setCategoryFilter('ALL');
    setAccountFilter('ALL');
    setFlowFilter('ALL');
    setTimeFilter('ALL');
    setCurrentPage(1);
  };

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

  const formatMoneyUsd = (usdVal: number) => {
    const val = currency === 'USD' ? usdVal : usdVal * fxRate;
    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCategoryBadge = (cat: string) => {
    if (cat.startsWith('Income')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
    }
    if (cat.startsWith('Debt') || cat.includes('AutoLoan')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/25';
    }
    if (cat.includes('Utilities') || cat.includes('Utility')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    }
    if (cat.includes('Dining')) {
      return 'bg-orange-500/10 text-orange-400 border-orange-500/25';
    }
    if (cat.includes('Groceries')) {
      return 'bg-lime-500/10 text-lime-400 border-lime-500/25';
    }
    if (cat.includes('Transport')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25';
    }
    if (cat.includes('Subscriptions')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
    }
    if (cat.includes('Transfer') || cat.includes('Remittance')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
    }
    if (cat === 'Bill') {
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25';
    }
    return 'bg-slate-500/10 text-slate-400 border-slate-500/25';
  };

  const renderSourceBadge = (src: 'BANK_API' | 'PAYROLL_API' | 'PDF_STATEMENT' | 'OTHER') => {
    switch (src) {
      case 'BANK_API':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <Zap className="w-2.5 h-2.5" />
            Bank API
          </span>
        );
      case 'PAYROLL_API':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
            <Briefcase className="w-2.5 h-2.5" />
            Paychex API
          </span>
        );
      case 'PDF_STATEMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            <FileText className="w-2.5 h-2.5" />
            Statement PDF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-semibold">
            Import
          </span>
        );
    }
  };

  return (
    <div className="bg-vault-950/90 border border-vault-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-vault-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Verified Transaction Stream
            </h2>
            <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-semibold">
              <Sparkles className="w-3 h-3" />
              Jev LLM Chart of Accounts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reconciled from direct SimpleFIN bank APIs, weekly Paychex payroll, and fallback statement PDFs.
          </p>
        </div>

        {/* Primary Source Filter Selector (Antislop Mode Switcher) */}
        <div className="flex flex-wrap items-center bg-vault-900 border border-vault-800 rounded-2xl p-1 text-xs">
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setSourceFilter('API_ONLY');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
              sourceFilter === 'API_ONLY'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>APIs Only (Bank & Payroll)</span>
          </button>
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setSourceFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
              sourceFilter === 'ALL'
                ? 'bg-vault-800 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All (530)
          </button>
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setSourceFilter('BANK_API');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
              sourceFilter === 'BANK_API'
                ? 'bg-vault-800 text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bank Feeds (397)
          </button>
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setSourceFilter('PAYROLL_API');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
              sourceFilter === 'PAYROLL_API'
                ? 'bg-vault-800 text-blue-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Paychex (93)
          </button>
          <button
            onClick={() => {
              nativeBridge.triggerHaptic('light');
              setSourceFilter('PDF_STATEMENT');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
              sourceFilter === 'PDF_STATEMENT'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Statement PDFs (33)</span>
          </button>
        </div>
      </div>

      {/* Aggregate Financial Metrics for Filtered Set */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-vault-900/60 border border-vault-800/80 rounded-2xl p-4">
        <div>
          <span className="text-[11px] text-slate-400">Filtered Records</span>
          <div className="text-xl font-extrabold text-white font-mono mt-0.5">
            {stats.count} <span className="text-xs font-normal text-slate-500">txns</span>
          </div>
        </div>
        <div>
          <span className="text-[11px] text-slate-400">Total Inflow</span>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
            +{formatMoneyUsd(stats.inflow)}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-slate-400">Total Outflow</span>
          <div className="text-xl font-extrabold text-slate-300 font-mono mt-0.5">
            -{formatMoneyUsd(stats.outflow)}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-slate-400">Net Flow</span>
          <div
            className={`text-xl font-extrabold font-mono mt-0.5 ${
              stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.net >= 0 ? '+' : '-'}
            {formatMoneyUsd(Math.abs(stats.net))}
          </div>
        </div>
      </div>

      {/* Filter Bar Controls */}
      <div className="space-y-3">
        {/* Search Input + Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search merchant, notes, account name, category..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-vault-900 border border-vault-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Account selector dropdown */}
          <div className="md:col-span-3">
            <select
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Connected Accounts ({availableAccountIds.length})</option>
              {availableAccountIds.map((accId) => {
                const info = getFriendlyAccountInfo(accId);
                return (
                  <option key={accId} value={accId}>
                    {info.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Flow selector dropdown */}
          <div className="md:col-span-2">
            <select
              value={flowFilter}
              onChange={(e) => {
                setFlowFilter(e.target.value as FlowFilter);
                setCurrentPage(1);
              }}
              className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Flows</option>
              <option value="INFLOW">Money In (+)</option>
              <option value="OUTFLOW">Money Out (-)</option>
            </select>
          </div>

          {/* Time range selector */}
          <div className="md:col-span-2 flex items-center gap-2">
            <select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value as TimeFilter);
                setCurrentPage(1);
              }}
              className="w-full bg-vault-900 border border-vault-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Time</option>
              <option value="30D">Last 30 Days</option>
              <option value="90D">Last 90 Days</option>
              <option value="1Y">This Year</option>
            </select>

            {(searchTerm ||
              categoryFilter !== 'ALL' ||
              accountFilter !== 'ALL' ||
              flowFilter !== 'ALL' ||
              timeFilter !== 'ALL' ||
              sourceFilter !== 'API_ONLY') && (
              <button
                onClick={resetFilters}
                className="p-2 bg-vault-900 border border-vault-800 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => {
              setCategoryFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all font-semibold ${
              categoryFilter === 'ALL'
                ? 'bg-vault-800 text-cyan-400 font-bold border border-vault-700'
                : 'bg-vault-900/60 text-slate-400 hover:text-white border border-vault-800/60'
            }`}
          >
            All Categories ({availableCategories.length})
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all text-[11px] font-medium ${
                categoryFilter === cat
                  ? 'bg-vault-800 text-white font-bold border border-vault-700'
                  : 'bg-vault-900/60 text-slate-400 hover:text-slate-200 border border-vault-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-vault-800/80 bg-vault-950/70">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-vault-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-vault-800">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Source & Counterparty</th>
              <th className="py-3 px-4">Account Origin</th>
              <th className="py-3 px-4">Category (Jev COA)</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 hidden lg:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vault-800/60">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 space-y-3">
                  <p className="text-sm">No transactions match your active filters.</p>
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-vault-800 text-slate-200 rounded-xl hover:text-white text-xs border border-vault-700"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset All Filters
                  </button>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const isIncome =
                  tx.category.startsWith('Income') ||
                  (!tx.category.startsWith('Expense') && !tx.category.startsWith('Debt') && tx.category.toLowerCase().includes('salary'));

                const src = getSourceType(tx);
                const accInfo = getFriendlyAccountInfo(tx.account_id);

                return (
                  <tr key={tx.id} className="hover:bg-vault-900/50 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {tx.date}
                    </td>

                    {/* Merchant & Source Badge */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        {isIncome ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{tx.merchant}</span>
                      </div>
                      <div className="mt-1">{renderSourceBadge(src)}</div>
                    </td>

                    {/* Friendly Account Name (Anti-slop) */}
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium truncate max-w-[200px]">
                        {accInfo.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                        {accInfo.institution}
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg border text-[10px] font-semibold ${getCategoryBadge(
                          tx.category
                        )}`}
                      >
                        {tx.category}
                      </span>
                    </td>

                    {/* Amount Column with Strict Anti-Slop Formatting */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-right">
                      <span className={isIncome ? 'text-emerald-400' : 'text-slate-200'}>
                        {isIncome ? '+' : '-'}
                        {formatAmount(tx.amount, tx.currency)}
                      </span>
                      {currency !== tx.currency && (
                        <span className="block text-[10px] text-slate-500 font-normal">
                          orig: {tx.currency === 'USD' ? '$' : '₹'}
                          {Math.abs(tx.amount).toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* Audit Notes */}
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-400 text-[11px] max-w-xs truncate">
                      {tx.notes || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-2">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-vault-900 border border-vault-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-500">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">
            Page <span className="font-bold text-white">{currentPage}</span> of {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-vault-900 border border-vault-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                nativeBridge.triggerHaptic('light');
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-vault-900 border border-vault-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
