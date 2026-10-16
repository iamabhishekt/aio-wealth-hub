use crate::models::{Account, AccountType, Category, CategoryGroup, CategoryGroupWithCategories, Currency, EmailAccountConfig, MerchantRule, Subscription, Transaction};
use anyhow::Result;
use chrono::Utc;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct LedgerDb {
    conn: Arc<Mutex<Connection>>,
}

impl LedgerDb {
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_schema()?;
        Ok(db)
    }

    pub fn open_file(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                account_type TEXT NOT NULL,
                currency TEXT NOT NULL,
                balance REAL NOT NULL,
                apr REAL,
                monthly_min_payment REAL,
                institution TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                date TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                merchant TEXT NOT NULL,
                category TEXT NOT NULL,
                is_recurring INTEGER NOT NULL,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                service_name TEXT NOT NULL,
                source TEXT NOT NULL,
                cost_per_cycle REAL NOT NULL,
                currency TEXT NOT NULL,
                cycle TEXT NOT NULL,
                next_renewal TEXT NOT NULL,
                status TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS email_accounts (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                email TEXT NOT NULL,
                app_password TEXT NOT NULL,
                server TEXT NOT NULL,
                port INTEGER NOT NULL,
                enabled INTEGER NOT NULL,
                last_synced_at TEXT
            );

            CREATE TABLE IF NOT EXISTS category_groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                group_type TEXT NOT NULL,
                color TEXT NOT NULL,
                sort_order INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                group_id TEXT NOT NULL,
                name TEXT NOT NULL,
                icon TEXT NOT NULL,
                is_system INTEGER NOT NULL,
                budget_amount REAL,
                FOREIGN KEY(group_id) REFERENCES category_groups(id)
            );

            CREATE TABLE IF NOT EXISTS merchant_rules (
                id TEXT PRIMARY KEY,
                pattern TEXT NOT NULL,
                match_type TEXT NOT NULL,
                clean_merchant TEXT NOT NULL,
                category_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            "#,
        )?;

        // Seed default Monarch category hierarchy if empty
        let count: i64 = conn.query_row("SELECT count(*) FROM category_groups", [], |row| row.get(0))?;
        if count == 0 {
            Self::seed_default_categories(&conn)?;
        }

        // Seed default merchant cleansing rules if empty
        let rules_count: i64 = conn.query_row("SELECT count(*) FROM merchant_rules", [], |row| row.get(0)).unwrap_or(0);
        if rules_count == 0 {
            Self::seed_default_rules(&conn)?;
        }

        Ok(())
    }

    fn seed_default_categories(conn: &Connection) -> Result<()> {
        let groups = vec![
            ("grp_income", "Income", "income", "#10b981", 1),
            ("grp_living", "Fixed Living Expenses", "expense", "#3b82f6", 2),
            ("grp_lifestyle", "Flexible Lifestyle", "expense", "#8b5cf6", 3),
            ("grp_financial", "Financial Goals & Debt", "expense", "#f59e0b", 4),
            ("grp_transfers", "Internal Transfers", "transfer", "#64748b", 5),
        ];

        for (id, name, gtype, color, order) in groups {
            conn.execute(
                "INSERT INTO category_groups (id, name, group_type, color, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, name, gtype, color, order],
            )?;
        }

        let categories: Vec<(&str, &str, &str, &str, i32, Option<f64>)> = vec![
            // Income
            ("cat_salary", "grp_income", "Paycheck & Bonus", "Wallet", 1, None),
            ("cat_dividends", "grp_income", "Investment Dividends", "TrendingUp", 1, None),
            ("cat_refunds", "grp_income", "Reimbursements & Refunds", "RotateCcw", 1, None),
            ("cat_other_income", "grp_income", "Other Income", "Coins", 1, None),

            // Fixed Living
            ("cat_housing", "grp_living", "Rent / Mortgage", "Home", 1, Some(2200.0)),
            ("cat_utilities", "grp_living", "Home Utilities & Power", "Zap", 1, Some(150.0)),
            ("cat_telecom", "grp_living", "Internet & Mobile", "Wifi", 1, Some(120.0)),
            ("cat_insurance", "grp_living", "Insurance Policies", "Shield", 1, Some(148.0)),
            ("cat_groceries", "grp_living", "Groceries & Household", "ShoppingCart", 1, Some(450.0)),

            // Flexible Lifestyle
            ("cat_dining", "grp_lifestyle", "Restaurants & Dining Out", "Utensils", 1, Some(350.0)),
            ("cat_coffee", "grp_lifestyle", "Coffee Shops & Cafes", "Coffee", 1, Some(60.0)),
            ("cat_shopping", "grp_lifestyle", "Shopping & Electronics", "Package", 1, Some(250.0)),
            ("cat_entertainment", "grp_lifestyle", "Subscriptions & Media", "Tv", 1, Some(70.0)),
            ("cat_travel", "grp_lifestyle", "Travel & Flights", "Plane", 1, Some(150.0)),
            ("cat_transit", "grp_lifestyle", "Gas & Transit", "Fuel", 1, Some(100.0)),

            // Financial Goals & Debt
            ("cat_loan_servicing", "grp_financial", "HDFC Home Loan Servicing", "Building", 1, Some(1640.0)),
            ("cat_auto_loan", "grp_financial", "Toyota Auto Loan", "Car", 1, Some(520.0)),
            ("cat_retirement", "grp_financial", "401(k) / IRA Contributions", "PiggyBank", 1, Some(500.0)),
            ("cat_investing", "grp_financial", "Brokerage Stock Investments", "TrendingUp", 1, Some(500.0)),
            ("cat_emergency_fund", "grp_financial", "Emergency Buffer Savings", "ShieldCheck", 1, Some(200.0)),

            // Internal Transfers
            ("cat_cc_payoff", "grp_transfers", "Credit Card Payment", "CreditCard", 1, None),
            ("cat_remittance_transfer", "grp_transfers", "Cross-Border Remittance (Crobo/Remitly)", "Globe", 1, None),
            ("cat_internal_transfer", "grp_transfers", "Internal Account Transfer", "ArrowRightLeft", 1, None),
        ];

        for (id, gid, name, icon, is_sys, budget) in categories {
            conn.execute(
                "INSERT INTO categories (id, group_id, name, icon, is_system, budget_amount) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, gid, name, icon, is_sys, budget],
            )?;
        }

        Ok(())
    }

    pub fn upsert_account(&self, acc: &Account) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let currency_str = match acc.currency {
            Currency::USD => "USD",
            Currency::INR => "INR",
        };
        let acc_type_str = format!("{:?}", acc.account_type);

        conn.execute(
            r#"
            INSERT INTO accounts (id, name, account_type, currency, balance, apr, monthly_min_payment, institution, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(id) DO UPDATE SET
                balance = excluded.balance,
                apr = excluded.apr,
                monthly_min_payment = excluded.monthly_min_payment,
                updated_at = excluded.updated_at;
            "#,
            params![
                acc.id,
                acc.name,
                acc_type_str,
                currency_str,
                acc.balance,
                acc.apr,
                acc.monthly_min_payment,
                acc.institution,
                acc.updated_at.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn get_all_accounts(&self) -> Result<Vec<Account>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, account_type, currency, balance, apr, monthly_min_payment, institution, updated_at FROM accounts")?;
        let rows = stmt.query_map([], |row| {
            let cur_str: String = row.get(3)?;
            let currency = if cur_str == "INR" { Currency::INR } else { Currency::USD };
            let acc_type_raw: String = row.get(2)?;
            let account_type = match acc_type_raw.as_str() {
                "CashChecking" => AccountType::CashChecking,
                "CashSavings" => AccountType::CashSavings,
                "CreditCardAmex" => AccountType::CreditCardAmex,
                "CreditCardApple" => AccountType::CreditCardApple,
                "CreditCardChase" => AccountType::CreditCardChase,
                "CreditCardCiti" => AccountType::CreditCardCiti,
                "LoanAuto" => AccountType::LoanAuto,
                "LoanStudent" => AccountType::LoanStudent,
                "LoanPersonal" => AccountType::LoanPersonal,
                "LoanMortgage" => AccountType::LoanMortgage,
                "InvestmentStock" => AccountType::InvestmentStock,
                "InvestmentMutualFund" => AccountType::InvestmentMutualFund,
                "InvestmentCrypto" => AccountType::InvestmentCrypto,
                "IndianLICPolicy" => AccountType::IndianLICPolicy,
                "IndianPPF" => AccountType::IndianPPF,
                "IndianEPF" => AccountType::IndianEPF,
                "InsurancePolicy" => AccountType::InsurancePolicy,
                "UtilityRecurring" => AccountType::UtilityRecurring,
                "SplitwiseNetBalance" => AccountType::SplitwiseNetBalance,
                _ => AccountType::CashChecking,
            };
            let updated_at_str: String = row.get(8)?;
            let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                account_type,
                currency,
                balance: row.get(4)?,
                apr: row.get(5)?,
                monthly_min_payment: row.get(6)?,
                institution: row.get(7)?,
                updated_at,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn upsert_subscription(&self, sub: &Subscription) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let cur_str = match sub.currency {
            Currency::USD => "USD",
            Currency::INR => "INR",
        };
        conn.execute(
            r#"
            INSERT INTO subscriptions (id, service_name, source, cost_per_cycle, currency, cycle, next_renewal, status)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(id) DO UPDATE SET
                cost_per_cycle = excluded.cost_per_cycle,
                next_renewal = excluded.next_renewal,
                status = excluded.status;
            "#,
            params![
                sub.id,
                sub.service_name,
                sub.source,
                sub.cost_per_cycle,
                cur_str,
                sub.cycle,
                sub.next_renewal,
                sub.status
            ],
        )?;
        Ok(())
    }

    pub fn get_subscriptions(&self) -> Result<Vec<Subscription>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, service_name, source, cost_per_cycle, currency, cycle, next_renewal, status FROM subscriptions")?;
        let rows = stmt.query_map([], |row| {
            let cur_str: String = row.get(4)?;
            let currency = if cur_str == "INR" { Currency::INR } else { Currency::USD };
            Ok(Subscription {
                id: row.get(0)?,
                service_name: row.get(1)?,
                source: row.get(2)?,
                cost_per_cycle: row.get(3)?,
                currency,
                cycle: row.get(5)?,
                next_renewal: row.get(6)?,
                status: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn upsert_email_account(&self, cfg: &EmailAccountConfig) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO email_accounts (id, label, email, app_password, server, port, enabled, last_synced_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(id) DO UPDATE SET
                label = excluded.label,
                email = excluded.email,
                app_password = excluded.app_password,
                server = excluded.server,
                port = excluded.port,
                enabled = excluded.enabled,
                last_synced_at = excluded.last_synced_at;
            "#,
            params![
                cfg.id,
                cfg.label,
                cfg.email,
                cfg.app_password,
                cfg.server,
                cfg.port,
                if cfg.enabled { 1 } else { 0 },
                cfg.last_synced_at
            ],
        )?;
        Ok(())
    }

    pub fn get_email_accounts(&self) -> Result<Vec<EmailAccountConfig>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, label, email, app_password, server, port, enabled, last_synced_at FROM email_accounts")?;
        let rows = stmt.query_map([], |row| {
            let enabled_int: i32 = row.get(6)?;
            Ok(EmailAccountConfig {
                id: row.get(0)?,
                label: row.get(1)?,
                email: row.get(2)?,
                app_password: row.get(3)?,
                server: row.get(4)?,
                port: row.get(5)?,
                enabled: enabled_int == 1,
                last_synced_at: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn delete_email_account(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM email_accounts WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn update_email_synced_at(&self, id: &str, timestamp: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE email_accounts SET last_synced_at = ?1 WHERE id = ?2",
            params![timestamp, id],
        )?;
        Ok(())
    }

    pub fn insert_transaction(&self, tx: &Transaction) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let cur_str = match tx.currency {
            Currency::USD => "USD",
            Currency::INR => "INR",
        };
        conn.execute(
            r#"
            INSERT INTO transactions (id, account_id, date, amount, currency, merchant, category, is_recurring, notes)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(id) DO UPDATE SET
                amount = excluded.amount,
                date = excluded.date,
                category = excluded.category,
                notes = excluded.notes;
            "#,
            params![
                tx.id,
                tx.account_id,
                tx.date,
                tx.amount,
                cur_str,
                tx.merchant,
                tx.category,
                if tx.is_recurring { 1 } else { 0 },
                tx.notes
            ],
        )?;
        Ok(())
    }

    pub fn get_transactions(&self) -> Result<Vec<Transaction>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, account_id, date, amount, currency, merchant, category, is_recurring, notes FROM transactions ORDER BY date DESC")?;
        let rows = stmt.query_map([], |row| {
            let cur_str: String = row.get(4)?;
            let currency = if cur_str == "INR" { Currency::INR } else { Currency::USD };
            let is_rec: i32 = row.get(7)?;
            Ok(Transaction {
                id: row.get(0)?,
                account_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                currency,
                merchant: row.get(5)?,
                category: row.get(6)?,
                is_recurring: is_rec == 1,
                notes: row.get(8)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn get_category_hierarchy(&self) -> Result<Vec<CategoryGroupWithCategories>> {
        let conn = self.conn.lock().unwrap();
        let mut group_stmt = conn.prepare("SELECT id, name, group_type, color, sort_order FROM category_groups ORDER BY sort_order ASC")?;
        let group_rows = group_stmt.query_map([], |row| {
            Ok(CategoryGroup {
                id: row.get(0)?,
                name: row.get(1)?,
                group_type: row.get(2)?,
                color: row.get(3)?,
                sort_order: row.get(4)?,
            })
        })?;

        let mut groups = Vec::new();
        for g in group_rows {
            groups.push(g?);
        }

        let mut cat_stmt = conn.prepare("SELECT id, group_id, name, icon, is_system, budget_amount FROM categories ORDER BY name ASC")?;
        let cat_rows = cat_stmt.query_map([], |row| {
            let is_sys: i32 = row.get(4)?;
            Ok(Category {
                id: row.get(0)?,
                group_id: row.get(1)?,
                name: row.get(2)?,
                icon: row.get(3)?,
                is_system: is_sys == 1,
                budget_amount: row.get(5)?,
            })
        })?;

        let mut all_cats = Vec::new();
        for c in cat_rows {
            all_cats.push(c?);
        }

        let mut hierarchy = Vec::new();
        for group in groups {
            let cats_for_group: Vec<Category> = all_cats
                .iter()
                .filter(|c| c.group_id == group.id)
                .cloned()
                .collect();
            hierarchy.push(CategoryGroupWithCategories {
                group,
                categories: cats_for_group,
            });
        }

        Ok(hierarchy)
    }

    pub fn upsert_category(&self, cat: &Category) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO categories (id, group_id, name, icon, is_system, budget_amount)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                group_id = excluded.group_id,
                icon = excluded.icon,
                budget_amount = excluded.budget_amount;
            "#,
            params![
                cat.id,
                cat.group_id,
                cat.name,
                cat.icon,
                if cat.is_system { 1 } else { 0 },
                cat.budget_amount
            ],
        )?;
        Ok(())
    }

    pub fn update_transaction_category(&self, tx_id: &str, category: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE transactions SET category = ?1 WHERE id = ?2",
            params![category, tx_id],
        )?;
        Ok(())
    }

    fn seed_default_rules(conn: &Connection) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let default_rules = vec![
            ("rule_amazon", "AMZN", "contains", "Amazon", "Shopping"),
            ("rule_bluebottle", "BLUE BOTTLE", "contains", "Blue Bottle Coffee", "Coffee & Cafes"),
            ("rule_starbucks", "STARBUCKS", "contains", "Starbucks", "Coffee & Cafes"),
            ("rule_uber", "UBER", "contains", "Uber", "Rideshare & Transit"),
            ("rule_lyft", "LYFT", "contains", "Lyft", "Rideshare & Transit"),
            ("rule_chase_payment", "CHASE CREDIT CRD", "contains", "Chase Card Payment", "Credit Card Payment"),
            ("rule_toyota", "TOYOTA", "contains", "Toyota Financial Services", "Auto Loan Payment"),
            ("rule_paychex", "PAYCHEX", "contains", "Employer Payroll", "Paycheck & Bonus"),
            ("rule_progressive", "PROGRESSIVE", "contains", "Progressive Insurance", "Auto & Home Insurance"),
            ("rule_verizon", "VERIZON", "contains", "Verizon Fios", "Internet & Telecom"),
            ("rule_jio", "JIO", "contains", "Jio Mobile Telecom", "Internet & Telecom"),
            ("rule_pseg", "PSEG", "contains", "PSE&G Electric & Gas", "Utilities & Energy"),
            ("rule_hdfc", "HDFC", "contains", "HDFC Bank NRI Home Loan", "HDFC NRI Home Loan"),
            ("rule_remitly", "REMITLY", "contains", "Remitly Global Transfer", "India Remittance"),
            ("rule_subway", "SUBWAY", "contains", "Subway", "Dining Out"),
            ("rule_traderjoes", "TRADER JOE", "contains", "Trader Joe's", "Groceries"),
            ("rule_wholefoods", "WHOLEFDS", "contains", "Whole Foods Market", "Groceries"),
        ];

        for (id, pattern, mtype, clean, cat) in default_rules {
            conn.execute(
                "INSERT OR IGNORE INTO merchant_rules (id, pattern, match_type, clean_merchant, category_name, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, pattern, mtype, clean, cat, now],
            )?;
        }
        Ok(())
    }

    pub fn get_merchant_rules(&self) -> Result<Vec<MerchantRule>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, pattern, match_type, clean_merchant, category_name, created_at FROM merchant_rules ORDER BY pattern ASC")?;
        let rows = stmt.query_map([], |row| {
            Ok(MerchantRule {
                id: row.get(0)?,
                pattern: row.get(1)?,
                match_type: row.get(2)?,
                clean_merchant: row.get(3)?,
                category_name: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn create_merchant_rule(&self, rule: &MerchantRule) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO merchant_rules (id, pattern, match_type, clean_merchant, category_name, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET pattern=excluded.pattern, match_type=excluded.match_type, clean_merchant=excluded.clean_merchant, category_name=excluded.category_name",
            params![rule.id, rule.pattern, rule.match_type, rule.clean_merchant, rule.category_name, rule.created_at],
        )?;
        Ok(())
    }

    pub fn delete_merchant_rule(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM merchant_rules WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn apply_merchant_rules(&self) -> Result<usize> {
        let rules = self.get_merchant_rules()?;
        let conn = self.conn.lock().unwrap();
        let mut updated_count = 0;

        for rule in rules {
            let pat = rule.pattern.to_uppercase();
            let mut stmt = conn.prepare("SELECT id, merchant FROM transactions")?;
            let txs: Vec<(String, String)> = stmt.query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })?.filter_map(|r| r.ok()).collect();

            for (tx_id, merchant) in txs {
                let m_upper = merchant.to_uppercase();
                let matches = match rule.match_type.as_str() {
                    "exact" => m_upper == pat,
                    _ => m_upper.contains(&pat),
                };

                if matches {
                    conn.execute(
                        "UPDATE transactions SET merchant = ?1, category = ?2 WHERE id = ?3",
                        params![rule.clean_merchant, rule.category_name, tx_id],
                    )?;
                    updated_count += 1;
                }
            }
        }
        Ok(updated_count)
    }
}
