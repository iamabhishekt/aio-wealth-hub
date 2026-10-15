use crate::models::{Account, AccountType, Currency, Subscription, Transaction};
use anyhow::Result;
use chrono::Utc;
use serde_json::Value;

pub struct SplitwiseConnector {
    pub api_key: String,
}

impl SplitwiseConnector {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    /// Free Splitwise API endpoint: GET /api/v3.0/get_current_user
    pub async fn fetch_net_balance(&self) -> Result<f64> {
        let client = reqwest::Client::new();
        let res = client
            .get("https://secure.splitwise.com/api/v3.0/get_current_user")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !res.status().is_success() {
            anyhow::bail!("Splitwise API returned status: {}", res.status());
        }

        let json: Value = res.json().await?;
        // Extract balance from user.balance
        let balance_str = json["user"]["balance"][0]["amount"]
            .as_str()
            .unwrap_or("0.0");
        let balance = balance_str.parse::<f64>().unwrap_or(0.0);
        Ok(balance)
    }
}

pub struct StatementParser;

impl StatementParser {
    /// Parse Apple Card CSV export (Format: Transaction Date, Clearing Date, Description, Merchant, Category, Type, Amount (USD))
    pub fn parse_apple_card_csv(csv_content: &str, account_id: &str) -> Vec<Transaction> {
        let mut txs = Vec::new();
        for (i, line) in csv_content.lines().enumerate() {
            if i == 0 || line.trim().is_empty() {
                continue; // skip header
            }
            let cols: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
            if cols.len() >= 7 {
                let date = cols[0].to_string();
                let merchant = cols[3].replace('"', "");
                let category = cols[4].replace('"', "");
                let amount = cols[6].replace('"', "").replace('$', "").parse::<f64>().unwrap_or(0.0);

                txs.push(Transaction {
                    id: format!("apple-{}-{}", account_id, i),
                    account_id: account_id.to_string(),
                    date,
                    amount,
                    currency: Currency::USD,
                    merchant,
                    category,
                    is_recurring: false,
                    notes: Some("Apple Card Import".to_string()),
                });
            }
        }
        txs
    }

    /// Parse Amex / Bank CSV export (Date, Description, Amount)
    pub fn parse_amex_csv(csv_content: &str, account_id: &str) -> Vec<Transaction> {
        let mut txs = Vec::new();
        for (i, line) in csv_content.lines().enumerate() {
            if i == 0 || line.trim().is_empty() {
                continue;
            }
            let cols: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
            if cols.len() >= 3 {
                let date = cols[0].to_string();
                let merchant = cols[1].replace('"', "");
                let amount = cols[2].replace('"', "").replace('$', "").parse::<f64>().unwrap_or(0.0);

                txs.push(Transaction {
                    id: format!("amex-{}-{}", account_id, i),
                    account_id: account_id.to_string(),
                    date,
                    amount,
                    currency: Currency::USD,
                    merchant,
                    category: "General".to_string(),
                    is_recurring: false,
                    notes: Some("Amex Import".to_string()),
                });
            }
        }
        txs
    }
}

pub struct IndianAssetsConnector;

impl IndianAssetsConnector {
    /// Create Indian Mutual Fund account from e-CAS summary
    pub fn create_mutual_fund_account(folio_name: &str, current_valuation_inr: f64) -> Account {
        Account {
            id: format!("mf-{}", folio_name.to_lowercase().replace(' ', "-")),
            name: format!("Mutual Funds ({})", folio_name),
            account_type: AccountType::InvestmentMutualFund,
            currency: Currency::INR,
            balance: current_valuation_inr,
            apr: None,
            monthly_min_payment: None,
            institution: "CAMS / KFintech CAS".to_string(),
            updated_at: Utc::now(),
        }
    }

    /// Create LIC / Life Insurance policy account
    pub fn create_lic_account(policy_num: &str, plan_name: &str, sum_assured_inr: f64, annual_premium_inr: f64) -> Account {
        Account {
            id: format!("lic-{}", policy_num),
            name: format!("LIC Policy #{} ({})", policy_num, plan_name),
            account_type: AccountType::IndianLICPolicy,
            currency: Currency::INR,
            balance: sum_assured_inr,
            apr: None,
            monthly_min_payment: Some(annual_premium_inr / 12.0),
            institution: "Life Insurance Corporation of India".to_string(),
            updated_at: Utc::now(),
        }
    }
}

pub struct GooglePlayConnector;

impl GooglePlayConnector {
    /// Parse Google Play subscription entry into unified Subscription
    pub fn make_subscription(service: &str, monthly_cost_usd: f64, renewal_date: &str) -> Subscription {
        Subscription {
            id: format!("gp-{}", service.to_lowercase().replace(' ', "-")),
            service_name: service.to_string(),
            source: "Google Play".to_string(),
            cost_per_cycle: monthly_cost_usd,
            currency: Currency::USD,
            cycle: "Monthly".to_string(),
            next_renewal: renewal_date.to_string(),
            status: "Active".to_string(),
        }
    }
}

pub struct ProviderConnector;

impl ProviderConnector {
    /// Toyota Financial Services Auto Loan
    pub fn create_toyota_auto_loan(remaining_principal_usd: f64, apr: f64, monthly_payment_usd: f64) -> Account {
        Account {
            id: "loan-toyota-financial".to_string(),
            name: "Toyota Financial Services (Auto Loan)".to_string(),
            account_type: AccountType::LoanAuto,
            currency: Currency::USD,
            balance: remaining_principal_usd,
            apr: Some(apr),
            monthly_min_payment: Some(monthly_payment_usd),
            institution: "Toyota Financial Services".to_string(),
            updated_at: Utc::now(),
        }
    }

    /// HDFC Home Loan (India)
    pub fn create_hdfc_home_loan(principal_inr: f64, roi_pct: f64, monthly_emi_inr: f64) -> Account {
        Account {
            id: "loan-hdfc-homeloan".to_string(),
            name: "HDFC Home Loan".to_string(),
            account_type: AccountType::LoanMortgage,
            currency: Currency::INR,
            balance: principal_inr,
            apr: Some(roi_pct),
            monthly_min_payment: Some(monthly_emi_inr),
            institution: "HDFC Bank".to_string(),
            updated_at: Utc::now(),
        }
    }

    /// Chase Bank Checking & Sapphire/Freedom Credit Card
    pub fn create_chase_checking(balance_usd: f64) -> Account {
        Account {
            id: "bank-chase-checking".to_string(),
            name: "Chase Total Checking (Debit)".to_string(),
            account_type: AccountType::CashChecking,
            currency: Currency::USD,
            balance: balance_usd,
            apr: None,
            monthly_min_payment: None,
            institution: "JPMorgan Chase".to_string(),
            updated_at: Utc::now(),
        }
    }

    pub fn create_chase_credit(balance_usd: f64, apr: f64, min_due: f64) -> Account {
        Account {
            id: "card-chase-sapphire".to_string(),
            name: "Chase Sapphire / Freedom".to_string(),
            account_type: AccountType::CreditCardChase,
            currency: Currency::USD,
            balance: balance_usd,
            apr: Some(apr),
            monthly_min_payment: Some(min_due),
            institution: "JPMorgan Chase".to_string(),
            updated_at: Utc::now(),
        }
    }

    /// PNC Bank Virtual Wallet / Checking
    pub fn create_pnc_checking(balance_usd: f64) -> Account {
        Account {
            id: "bank-pnc-checking".to_string(),
            name: "PNC Bank Virtual Wallet".to_string(),
            account_type: AccountType::CashChecking,
            currency: Currency::USD,
            balance: balance_usd,
            apr: None,
            monthly_min_payment: None,
            institution: "PNC Bank".to_string(),
            updated_at: Utc::now(),
        }
    }

    /// Progressive Auto / Home Insurance
    pub fn create_progressive_insurance(monthly_premium_usd: f64) -> Account {
        Account {
            id: "ins-progressive".to_string(),
            name: "Progressive Auto / Home Insurance".to_string(),
            account_type: AccountType::InsurancePolicy,
            currency: Currency::USD,
            balance: 0.0,
            apr: None,
            monthly_min_payment: Some(monthly_premium_usd),
            institution: "Progressive Casualty Insurance".to_string(),
            updated_at: Utc::now(),
        }
    }

    /// Robinhood Investment Portfolio
    pub fn create_robinhood_portfolio(portfolio_value_usd: f64) -> Account {
        Account {
            id: "inv-robinhood".to_string(),
            name: "Robinhood (Equities & Crypto)".to_string(),
            account_type: AccountType::InvestmentStock,
            currency: Currency::USD,
            balance: portfolio_value_usd,
            apr: None,
            monthly_min_payment: None,
            institution: "Robinhood Financial".to_string(),
            updated_at: Utc::now(),
        }
    }

    /// Recurring Utility Bills (PSEG, Verizon Fios, T-Mobile, Jio, Airtel)
    pub fn create_utility_account(id: &str, name: &str, institution: &str, monthly_cost: f64, currency: Currency) -> Account {
        Account {
            id: id.to_string(),
            name: name.to_string(),
            account_type: AccountType::UtilityRecurring,
            currency,
            balance: 0.0,
            apr: None,
            monthly_min_payment: Some(monthly_cost),
            institution: institution.to_string(),
            updated_at: Utc::now(),
        }
    }

    /// Streaming Subscriptions (Netflix India, JioHotstar)
    pub fn create_streaming_sub(id: &str, name: &str, cost: f64, currency: Currency, source: &str, renewal: &str) -> Subscription {
        Subscription {
            id: id.to_string(),
            service_name: name.to_string(),
            source: source.to_string(),
            cost_per_cycle: cost,
            currency,
            cycle: "Monthly".to_string(),
            next_renewal: renewal.to_string(),
            status: "Active".to_string(),
        }
    }
}
