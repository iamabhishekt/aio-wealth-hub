use crate::models::{Account, AccountType, Currency, Subscription};
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
            "#,
        )?;
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
                "LoanAuto" => AccountType::LoanAuto,
                "LoanStudent" => AccountType::LoanStudent,
                "LoanPersonal" => AccountType::LoanPersonal,
                "LoanMortgage" => AccountType::LoanMortgage,
                "InvestmentStock" => AccountType::InvestmentStock,
                "InvestmentMutualFund" => AccountType::InvestmentMutualFund,
                "IndianLICPolicy" => AccountType::IndianLICPolicy,
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
}
