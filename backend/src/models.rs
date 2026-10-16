use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Currency {
    USD,
    INR,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AccountType {
    CashChecking,
    CashSavings,
    CreditCardAmex,
    CreditCardApple,
    CreditCardChase,
    CreditCardCiti,
    LoanAuto,
    LoanStudent,
    LoanPersonal,
    LoanMortgage,
    InvestmentStock,
    InvestmentMutualFund,
    InvestmentCrypto,
    IndianLICPolicy,
    IndianPPF,
    IndianEPF,
    InsurancePolicy,
    UtilityRecurring,
    SplitwiseNetBalance,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub account_type: AccountType,
    pub currency: Currency,
    pub balance: f64,
    pub apr: Option<f64>,
    pub monthly_min_payment: Option<f64>,
    pub institution: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub account_id: String,
    pub date: String,
    pub amount: f64,
    pub currency: Currency,
    pub merchant: String,
    pub category: String,
    pub is_recurring: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: String,
    pub service_name: String,
    pub source: String, // e.g. "Google Play", "Apple App Store", "Direct", "Jio/Hotstar", "Netflix India"
    pub cost_per_cycle: f64,
    pub currency: Currency,
    pub cycle: String, // "Monthly", "Annual"
    pub next_renewal: String,
    pub status: String, // "Active", "Trial", "FlaggedForCancellation"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifeInsurancePolicy {
    pub policy_number: String,
    pub insurer: String, // e.g. "LIC of India", "Progressive", "HDFC Life"
    pub policy_name: String,
    pub sum_assured_inr: f64,
    pub annual_premium_inr: f64,
    pub premium_due_date: String,
    pub maturity_date: String,
    pub guaranteed_payout_inr: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetWorthSnapshot {
    pub total_usd: f64,
    pub total_inr: f64,
    pub fx_rate_usd_to_inr: f64,
    pub assets_usd: f64,
    pub liabilities_usd: f64,
    pub splitwise_net_owed_to_you_usd: f64,
    pub monthly_burn_usd: f64,
    pub runway_months: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailAccountConfig {
    pub id: String,
    pub label: String,
    pub email: String,
    pub app_password: String,
    pub server: String,
    pub port: u16,
    pub enabled: bool,
    pub last_synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryGroup {
    pub id: String,
    pub name: String,
    pub group_type: String, // "income", "expense", "transfer"
    pub color: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub group_id: String,
    pub name: String,
    pub icon: String,
    pub is_system: bool,
    pub budget_amount: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryGroupWithCategories {
    pub group: CategoryGroup,
    pub categories: Vec<Category>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MerchantRule {
    pub id: String,
    pub pattern: String,
    pub match_type: String, // "contains", "exact", "regex"
    pub clean_merchant: String,
    pub category_name: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRuleRequest {
    pub pattern: String,
    pub match_type: Option<String>,
    pub clean_merchant: String,
    pub category_name: String,
    pub apply_to_existing: Option<bool>,
}


