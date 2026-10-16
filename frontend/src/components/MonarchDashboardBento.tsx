import React from 'react';
import { Account, Currency, ForecastResult, Transaction } from '../types';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Calendar,
  ChevronRight,
  FolderTree,
} from 'lucide-react';

interface Props {
  forecast: ForecastResult;
  accounts: Account[];
  transactions: Transaction[];
  currency: Currency;
  fxRate: number;
  onNavigateTab: (tab: any) => void;
  onOpenSimpleFin: () => void;
}

export const MonarchDashboardBento: React.FC<Props> = ({
  forecast,
  accounts,
  transactions,
  currency,
  fxRate,
  onNavigateTab,
  onOpenSimpleFin,
}) => {
  const isUSD = currency === 'USD';

  const formatMoney = (usdVal: number) => {
    const val = isUSD ? usdVal : usdVal * fxRate;
    const symbol = isUSD ? '$' : '₹';
    return `${symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatMoneyExact = (usdVal: number) => {
    const val = isUSD ? usdVal : usdVal * fxRate;
    const symbol = isUSD ? '$' : '₹';
    return `${symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Savings rate calculation (Monarch Common_GetCashFlowDashboard)
  const inflow = forecast.monthly_inflow_usd;
  const outflow = forecast.monthly_burn_usd;
  const netSurplus = forecast.monthly_surplus_usd;
  const savingsRate = Math.max(0, Math.round((netSurplus / inflow) * 100));

  // Upcoming recurring items (Monarch Mobile_GetDashboardUpcomingRecurringTransactionItems)
  const upcomingBills = [
    {
      id: 'bill_paychex',
      name: 'Paychex Weekly Net Payroll',
      amount: 1210.02,
      type: 'inflow',
      date: 'Oct 20',
      daysLeft: 4,
      account: 'Chase Premier Checking',
      status: 'Scheduled',
    },
    {
      id: 'bill_toyota',
      name: 'Toyota Financial Auto Loan',
      amount: -482.10,
      type: 'outflow',
      date: 'Oct 22',
      daysLeft: 6,
      account: 'Chase Premier Checking',
      status: 'Auto-Pay',
    },
    {
      id: 'bill_progressive',
      name: 'Progressive Auto Insurance',
      amount: -142.50,
      type: 'outflow',
      date: 'Oct 25',
      daysLeft: 9,
      account: 'Apple Card',
      status: 'Auto-Pay',
    },
    {
      id: 'bill_verizon',
      name: 'Verizon Wireless 5G Home/Mobile',
      amount: -85.00,
      type: 'outflow',
      date: 'Oct 28',
      daysLeft: 12,
      account: 'Citi Double Cash',
      status: 'Auto-Pay',
    },
    {
      id: 'bill_jio',
      name: 'Reliance Jio Fiber 1Gbps (India)',
      amount: -749 / fxRate,
      type: 'outflow',
      date: 'Oct 31',
      daysLeft: 15,
      account: 'SBI NRE Checking',
      status: 'Scheduled',
    },
  ];

  // Budget progress items (Monarch DashboardWidgetBudget)
  const budgetCategories = [
    { name: 'Food & Dining', spent: 450, budget: 600, color: 'bg-amber-400', barColor: 'from-amber-400 to-orange-500' },
    { name: 'Groceries & Household', spent: 520, budget: 650, color: 'bg-emerald-400', barColor: 'from-emerald-400 to-teal-500' },
    { name: 'Tech Subscriptions & SaaS', spent: 178, budget: 200, color: 'bg-blue-400', barColor: 'from-blue-400 to-indigo-500' },
    { name: 'Transportation & Gas', spent: 210, budget: 300, color: 'bg-cyan-400', barColor: 'from-cyan-400 to-sky-500' },
  ];

  // 5 Recent cleansed transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* MONARCH BENTO SECTION 1: Cashflow Analytics & Savings Rate (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* WIDGET 1A: Cashflow & Savings Rate Dial (Monarch Common_GetCashFlowDashboard) */}
        <div className="lg:col-span-7 p-1.5 sm:p-2 rounded-3xl bg-vault-900/40 border border-white/[0.07] backdrop-blur-md shadow-2xl">
          <div className="bg-[#0d1424]/90 rounded-[22px] border border-white/[0.04] p-5 sm:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                    Monthly Cashflow & Savings Dial
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Reconciled Inflow vs Total Outflow
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSimpleFin}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-vault-950/80 border border-white/[0.08] hover:border-cyan-500/40 text-[11px] text-slate-300 transition-colors cursor-pointer"
                  title="Open SimpleFIN Connection Hub"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{accounts.length} Synced</span>
                </button>

                {/* Savings Rate Pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {savingsRate}% Savings Rate
                  </span>
                </div>
              </div>
            </div>

            {/* Inflow vs Outflow vs Surplus Triad */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Inflow */}
              <div className="p-3.5 rounded-2xl bg-vault-950/70 border border-white/[0.05] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Total Inflow</span>
                </div>
                <div className="text-base sm:text-lg font-mono font-extrabold text-emerald-400 tracking-tight tabular-nums">
                  +{formatMoney(inflow)}
                </div>
                <span className="text-[10px] text-slate-500 font-sans block">Verified Paychex Net</span>
              </div>

              {/* Outflow */}
              <div className="p-3.5 rounded-2xl bg-vault-950/70 border border-white/[0.05] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  <span>Total Outflow</span>
                </div>
                <div className="text-base sm:text-lg font-mono font-extrabold text-slate-200 tracking-tight tabular-nums">
                  -{formatMoney(outflow)}
                </div>
                <span className="text-[10px] text-slate-500 font-sans block">Debt + Housing + Living</span>
              </div>

              {/* Net Surplus */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Net Savings</span>
                </div>
                <div className="text-base sm:text-lg font-mono font-extrabold text-emerald-300 tracking-tight tabular-nums">
                  +{formatMoney(netSurplus)}
                </div>
                <span className="text-[10px] text-emerald-500 font-sans block">Free Cashflow Available</span>
              </div>
            </div>

            {/* Progress Track Visualizer */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Burn Velocity: {Math.round((outflow / inflow) * 100)}% of Inflow</span>
                <span className="text-emerald-400">Surplus: +{formatMoney(netSurplus)}</span>
              </div>
              <div className="w-full bg-vault-950 rounded-full h-3 overflow-hidden p-0.5 border border-white/[0.06] flex gap-1">
                <div
                  className="bg-rose-500/80 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((outflow / inflow) * 100)}%` }}
                  title="Monthly Burn"
                />
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${savingsRate}%` }}
                  title="Savings Rate"
                />
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET 1B: Rollover Budget Progress Tracker (Monarch DashboardWidgetBudget) */}
        <div className="lg:col-span-5 p-1.5 sm:p-2 rounded-3xl bg-vault-900/40 border border-white/[0.07] backdrop-blur-md shadow-2xl">
          <div className="bg-[#0d1424]/90 rounded-[22px] border border-white/[0.04] p-5 sm:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Rollover Budget Progress
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Category Caps vs Actual Spend
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('categories')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category Progress Meters */}
            <div className="space-y-3 pt-1">
              {budgetCategories.map((cat) => {
                const percent = Math.min(100, Math.round((cat.spent / cat.budget) * 100));
                const remaining = Math.max(0, cat.budget - cat.spent);

                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{cat.name}</span>
                      <div className="font-mono text-xs">
                        <span className="font-bold text-white tabular-nums">{formatMoney(cat.spent)}</span>
                        <span className="text-slate-500"> / {formatMoney(cat.budget)}</span>
                        <span className="text-slate-400 text-[10px] ml-2 font-sans">
                          ({formatMoney(remaining)} left)
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-vault-950 rounded-full h-2 overflow-hidden border border-white/[0.05]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${cat.barColor} transition-all duration-700`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MONARCH BENTO SECTION 2: Upcoming Recurring Bills & Recent Cleansed Ledger (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* WIDGET 2A: Upcoming Recurring Bills Radar (Monarch Mobile_GetDashboardUpcomingRecurringTransactionItems) */}
        <div className="lg:col-span-5 p-1.5 sm:p-2 rounded-3xl bg-vault-900/40 border border-white/[0.07] backdrop-blur-md shadow-2xl">
          <div className="bg-[#0d1424]/90 rounded-[22px] border border-white/[0.04] p-5 sm:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Upcoming Bills & Paydays
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Next 14 Days Remaining Due
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('subscriptions')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Subscriptions</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of upcoming bills */}
            <div className="space-y-2 pt-1">
              {upcomingBills.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-2xl bg-vault-950/70 border border-white/[0.05] hover:border-white/[0.1] transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-vault-900 border border-vault-800 flex items-center justify-center text-[10px] font-mono font-bold text-amber-400 shrink-0">
                      {b.date.split(' ')[1]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-200 truncate">{b.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                        <span>{b.account}</span>
                        <span>·</span>
                        <span className="text-amber-400 font-sans">in {b.daysLeft} days</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono font-bold text-xs tabular-nums ${
                        b.type === 'inflow' ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {b.type === 'inflow' ? '+' : ''}{formatMoneyExact(b.amount)}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-vault-900 border border-vault-800 text-slate-400 block mt-0.5 font-mono">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WIDGET 2B: Recent Cleansed Transactions (Monarch Common_GetTransactionsListDashboard) */}
        <div className="lg:col-span-7 p-1.5 sm:p-2 rounded-3xl bg-vault-900/40 border border-white/[0.07] backdrop-blur-md shadow-2xl">
          <div className="bg-[#0d1424]/90 rounded-[22px] border border-white/[0.04] p-5 sm:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Recent Cleansed Ledger Feed
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Auto-Rules & Categorization Applied
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('transactions')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Full Ledger ({transactions.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of recent transactions */}
            <div className="space-y-2 pt-1">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => onNavigateTab('transactions')}
                  className="p-3 rounded-2xl bg-vault-950/70 border border-white/[0.05] hover:border-cyan-500/30 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-vault-900 border border-vault-800 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0 group-hover:border-cyan-500/40 transition-colors">
                      {tx.merchant.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        <span>{tx.clean_merchant || tx.merchant}</span>
                        {tx.clean_merchant && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
                            Rule Applied
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                          {tx.category}
                        </span>
                        <span>{tx.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono font-bold text-xs tabular-nums ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}{formatMoneyExact(tx.amount)}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">USD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
