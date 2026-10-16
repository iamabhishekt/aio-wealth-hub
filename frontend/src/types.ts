export type Currency = 'USD' | 'INR';

export type AccountType =
  | 'CashChecking'
  | 'CashSavings'
  | 'CreditCardAmex'
  | 'CreditCardApple'
  | 'CreditCardChase'
  | 'CreditCardCiti'
  | 'CreditCardGeneric'
  | 'LoanAuto'
  | 'LoanStudent'
  | 'LoanPersonal'
  | 'LoanMortgage'
  | 'InvestmentStock'
  | 'InvestmentMutualFund'
  | 'InvestmentCrypto'
  | 'Investment401k'
  | 'IndianLICPolicy'
  | 'IndianPPF'
  | 'IndianEPF'
  | 'InsurancePolicy'
  | 'UtilityRecurring'
  | 'SplitwiseNetBalance'
  | 'TransferGateway';

export interface Account {
  id: string;
  name: string;
  account_type: AccountType;
  currency: Currency;
  balance: f64;
  apr?: number | null;
  monthly_min_payment?: number | null;
  institution: string;
  updated_at: string;
}

type f64 = number;

export interface Subscription {
  id: string;
  service_name: string;
  source: string; // 'Google Play' | 'Apple App Store' | 'Direct'
  cost_per_cycle: number;
  currency: Currency;
  cycle: string; // 'Monthly' | 'Annual'
  next_renewal: string;
  status: string; // 'Active' | 'FlaggedForCancellation'
}

export interface ForecastResult {
  current_net_worth_usd: number;
  current_net_worth_inr: number;
  total_assets_usd: number;
  total_liabilities_usd: number;
  monthly_inflow_usd: number;
  monthly_burn_usd: number;
  monthly_surplus_usd: number;
  annual_subscription_drag_usd: number;
  projected_12m_curve_usd: number[];
}

export interface Transaction {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  currency: Currency;
  merchant: string;
  category: string;
  is_recurring: boolean;
  notes?: string;
}

export interface FinancialIndependenceMetrics {
  monthly_net_income_usd: number;
  total_monthly_burn_usd: number;
  annual_expenses_usd: number;
  monthly_savings_usd: number;
  savings_rate_percent: number;
  fire_target_standard_usd: number;
  fire_target_lean_usd: number;
  fire_target_fat_usd: number;
  current_invested_assets_usd: number;
  fire_progress_percent: number;
  years_to_fi: number;
  rule_of_thumb: string;
}

export interface DebtPayoffMetrics {
  total_debt_usd: number;
  total_min_monthly_usd: number;
  extra_payoff_capacity_usd: number;
  avalanche_priority: string[];
  snowball_priority: string[];
}

export interface EmergencyFundMetrics {
  total_liquid_cash_usd: number;
  monthly_burn_baseline_usd: number;
  runway_months: number;
  status: string;
  accounts: { name: string; usd: number }[];
}

export interface OpenAccountantReport {
  status: string;
  financial_independence: FinancialIndependenceMetrics;
  debt_payoff: DebtPayoffMetrics;
  emergency_fund: EmergencyFundMetrics;
}

export interface CategoryGroup {
  id: string;
  name: string;
  group_type: 'income' | 'expense' | 'transfer';
  color: string;
  sort_order: number;
}

export interface Category {
  id: string;
  group_id: string;
  name: string;
  icon: string;
  is_system: boolean;
  budget_amount?: number | null;
}

export interface CategoryGroupWithCategories {
  group: CategoryGroup;
  categories: Category[];
}


