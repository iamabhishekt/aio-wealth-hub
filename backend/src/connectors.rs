use crate::models::{Account, AccountType, Currency, Subscription, Transaction};
use anyhow::Result;
use chrono::Utc;
use serde_json::Value;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitwiseFriendBalance {
    pub id: i64,
    pub name: String,
    pub balance: f64,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitwiseExpenseItem {
    pub id: i64,
    pub description: String,
    pub cost: f64,
    pub currency: String,
    pub date: String,
    pub created_by: String,
    pub is_payment: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitwiseFullDetails {
    pub net_balance_usd: f64,
    pub total_owed_to_you: f64,
    pub total_you_owe: f64,
    pub friends: Vec<SplitwiseFriendBalance>,
    pub recent_expenses: Vec<SplitwiseExpenseItem>,
}

pub struct SplitwiseConnector {
    pub api_key: String,
}

impl SplitwiseConnector {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    /// Splitwise API endpoint: GET /api/v3.0/get_friends
    pub async fn fetch_net_balance(&self) -> Result<f64> {
        let details = self.fetch_full_details().await?;
        Ok(details.net_balance_usd)
    }

    /// Fetch complete friend breakdown and recent expense stream
    pub async fn fetch_full_details(&self) -> Result<SplitwiseFullDetails> {
        let client = reqwest::Client::new();
        let res = client
            .get("https://secure.splitwise.com/api/v3.0/get_friends")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("User-Agent", "AIO-Wealth-Hub/1.0")
            .send()
            .await?;

        if !res.status().is_success() {
            anyhow::bail!("Splitwise API returned status: {}", res.status());
        }

        let json: Value = res.json().await?;
        let mut net_balance = 0.0;
        let mut total_owed_to_you = 0.0;
        let mut total_you_owe = 0.0;
        let mut friend_balances = Vec::new();

        if let Some(friends) = json["friends"].as_array() {
            for friend in friends {
                let id = friend["id"].as_i64().unwrap_or(0);
                let first_name = friend["first_name"].as_str().unwrap_or("Friend");
                let last_name = friend["last_name"].as_str().unwrap_or("");
                let full_name = if last_name.trim().is_empty() {
                    first_name.to_string()
                } else {
                    format!("{} {}", first_name, last_name)
                };

                if let Some(balances) = friend["balance"].as_array() {
                    for b in balances {
                        if let Some(amt_str) = b["amount"].as_str() {
                            if let Ok(amt) = amt_str.parse::<f64>() {
                                if amt.abs() > 0.001 {
                                    let cur = b["currency_code"].as_str().unwrap_or("USD").to_string();
                                    net_balance += amt;
                                    if amt > 0.0 {
                                        total_owed_to_you += amt;
                                    } else {
                                        total_you_owe += amt.abs();
                                    }
                                    friend_balances.push(SplitwiseFriendBalance {
                                        id,
                                        name: full_name.clone(),
                                        balance: amt,
                                        currency: cur,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        // Sort: highest money owed to you first, then what you owe
        friend_balances.sort_by(|a, b| b.balance.partial_cmp(&a.balance).unwrap_or(std::cmp::Ordering::Equal));

        // Fetch recent expenses
        let mut recent_expenses = Vec::new();
        if let Ok(exp_res) = client
            .get("https://secure.splitwise.com/api/v3.0/get_expenses?limit=15")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("User-Agent", "AIO-Wealth-Hub/1.0")
            .send()
            .await
        {
            if exp_res.status().is_success() {
                if let Ok(exp_json) = exp_res.json::<Value>().await {
                    if let Some(expenses) = exp_json["expenses"].as_array() {
                        for exp in expenses {
                            let id = exp["id"].as_i64().unwrap_or(0);
                            let description = exp["description"].as_str().unwrap_or("Expense").to_string();
                            let cost = exp["cost"].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                            let currency = exp["currency_code"].as_str().unwrap_or("USD").to_string();
                            let date = exp["date"].as_str().unwrap_or("").to_string();
                            let created_by = exp["created_by"]["first_name"].as_str().unwrap_or("User").to_string();
                            let is_payment = exp["payment"].as_bool().unwrap_or(false);

                            recent_expenses.push(SplitwiseExpenseItem {
                                id,
                                description,
                                cost,
                                currency,
                                date,
                                created_by,
                                is_payment,
                            });
                        }
                    }
                }
            }
        }

        Ok(SplitwiseFullDetails {
            net_balance_usd: (net_balance * 100.0).round() / 100.0,
            total_owed_to_you: (total_owed_to_you * 100.0).round() / 100.0,
            total_you_owe: (total_you_owe * 100.0).round() / 100.0,
            friends: friend_balances,
            recent_expenses,
        })
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

    /// Parse OFX / QFX bank or Apple Card statement using open-source ofxy
    pub fn parse_ofx_statement(ofx_content: &str, account_id: &str) -> Vec<Transaction> {
        let mut txs = Vec::new();
        if let Ok(doc) = ofx_content.parse::<ofxy::Ofx>() {
            if let Some(cc) = doc.body.credit_card {
                let resp = &cc.transaction_response;
                if let Some(bank_txs) = &resp.statement.bank_transactions {
                    for (i, tx) in bank_txs.transactions.iter().enumerate() {
                        let amount = tx.amount.to_string().parse::<f64>().unwrap_or(0.0);
                        let merchant = tx.name.clone().unwrap_or_else(|| "Unknown".to_string());
                        let date = tx.date_posted.to_string();
                        txs.push(Transaction {
                            id: format!("ofx-{}-{}", account_id, i),
                            account_id: account_id.to_string(),
                            date,
                            amount,
                            currency: Currency::USD,
                            merchant,
                            category: "Credit Card".to_string(),
                            is_recurring: false,
                            notes: Some("OFX Statement Import".to_string()),
                        });
                    }
                }
            }
        }
        txs
    }

    /// Parse normalized alert CSV (Transaction Date,Description,Category,Amount,Currency)
    pub fn parse_alert_or_generic_csv(csv_content: &str, account_id: &str) -> Vec<Transaction> {
        let mut txs = Vec::new();
        for (i, line) in csv_content.lines().enumerate() {
            if i == 0 || line.trim().is_empty() {
                continue;
            }
            let cols: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
            if cols.len() >= 4 {
                let date = cols[0].to_string();
                let merchant = cols[1].replace('"', "");
                let category = cols[2].replace('"', "");
                let amount = cols[3]
                    .replace('"', "")
                    .replace('$', "")
                    .replace('₹', "")
                    .parse::<f64>()
                    .unwrap_or(0.0);
                let cur = if cols.len() >= 5 && cols[4].to_uppercase().contains("INR") {
                    Currency::INR
                } else {
                    Currency::USD
                };

                txs.push(Transaction {
                    id: format!("{}-{}-{}", account_id, date.replace(' ', "_").replace(':', "-"), i),
                    account_id: account_id.to_string(),
                    date,
                    amount,
                    currency: cur,
                    merchant,
                    category,
                    is_recurring: true,
                    notes: Some("Automated Email Alert Ingestion".to_string()),
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
