export type Currency = 'USD' | 'INR';

export type AccountType =
  | 'CashChecking'
  | 'CashSavings'
  | 'CreditCardAmex'
  | 'CreditCardApple'
  | 'LoanAuto'
  | 'LoanStudent'
  | 'LoanPersonal'
  | 'LoanMortgage'
  | 'InvestmentStock'
  | 'InvestmentMutualFund'
  | 'InvestmentCrypto'
  | 'IndianLICPolicy'
  | 'IndianPPF'
  | 'IndianEPF'
  | 'SplitwiseNetBalance';

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
