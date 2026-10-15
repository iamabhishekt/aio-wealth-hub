pub mod connectors;
pub mod forecaster;
pub mod ledger;
pub mod models;

pub use connectors::*;
pub use forecaster::*;
pub use ledger::*;
pub use models::*;

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_ledger_and_forecaster_flow() {
        let db = LedgerDb::new_in_memory().expect("in-memory db failed");

        let checking = Account {
            id: "us-chase-chk".to_string(),
            name: "Chase Checking".to_string(),
            account_type: AccountType::CashChecking,
            currency: Currency::USD,
            balance: 5400.0,
            apr: None,
            monthly_min_payment: None,
            institution: "Chase Bank".to_string(),
            updated_at: Utc::now(),
        };

        let apple_card = Account {
            id: "us-apple-card".to_string(),
            name: "Apple Card".to_string(),
            account_type: AccountType::CreditCardApple,
            currency: Currency::USD,
            balance: 1250.0,
            apr: Some(19.24),
            monthly_min_payment: Some(125.0),
            institution: "Goldman Sachs".to_string(),
            updated_at: Utc::now(),
        };

        let mf_india = IndianAssetsConnector::create_mutual_fund_account("Nippon Nifty 50", 450_000.0);
        let lic_policy = IndianAssetsConnector::create_lic_account("88349210", "Jeevan Anand", 1_000_000.0, 48_000.0);

        db.upsert_account(&checking).unwrap();
        db.upsert_account(&apple_card).unwrap();
        db.upsert_account(&mf_india).unwrap();
        db.upsert_account(&lic_policy).unwrap();

        let accounts = db.get_all_accounts().unwrap();
        assert_eq!(accounts.len(), 4);

        let sub1 = GooglePlayConnector::make_subscription("Google One 2TB", 9.99, "2026-11-01");
        let sub2 = Subscription {
            id: "sub-amzn".to_string(),
            service_name: "Amazon Prime".to_string(),
            source: "Direct".to_string(),
            cost_per_cycle: 139.0,
            currency: Currency::USD,
            cycle: "Annual".to_string(),
            next_renewal: "2027-02-15".to_string(),
            status: "Active".to_string(),
        };

        db.upsert_subscription(&sub1).unwrap();
        db.upsert_subscription(&sub2).unwrap();

        let subs = db.get_subscriptions().unwrap();
        assert_eq!(subs.len(), 2);

        let forecast = WealthForecaster::compute_snapshot(&accounts, &subs, 6500.0, 86.5);
        assert!(forecast.total_assets_usd > 15000.0);
        assert!(forecast.total_liabilities_usd >= 1250.0);
        assert!(forecast.projected_12m_curve_usd.len() == 12);
        assert!(forecast.projected_12m_curve_usd[11] > forecast.current_net_worth_usd);
    }

    #[test]
    fn test_csv_parsers() {
        let sample_apple_csv = "Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD)\n\
        10/12/2026,10/13/2026,WHOLE FOODS MARKET,Whole Foods Market,Groceries,Purchase,$42.50\n\
        10/13/2026,10/14/2026,UBER TRIP,Uber,Transportation,Purchase,$18.25\n";

        let txs = StatementParser::parse_apple_card_csv(sample_apple_csv, "apple-card-1");
        assert_eq!(txs.len(), 2);
        assert_eq!(txs[0].merchant, "Whole Foods Market");
        assert_eq!(txs[0].amount, 42.50);
        assert_eq!(txs[1].merchant, "Uber");
        assert_eq!(txs[1].amount, 18.25);
    }
}
