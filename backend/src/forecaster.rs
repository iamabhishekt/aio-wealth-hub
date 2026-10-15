use crate::models::{Account, AccountType, Currency, Subscription};

pub const DEFAULT_USD_TO_INR: f64 = 86.5;

pub struct WealthForecaster;

#[derive(serde::Serialize)]
pub struct ForecastResult {
    pub current_net_worth_usd: f64,
    pub current_net_worth_inr: f64,
    pub total_assets_usd: f64,
    pub total_liabilities_usd: f64,
    pub monthly_inflow_usd: f64,
    pub monthly_burn_usd: f64,
    pub monthly_surplus_usd: f64,
    pub annual_subscription_drag_usd: f64,
    pub projected_12m_curve_usd: Vec<f64>,
}

impl WealthForecaster {
    pub fn compute_snapshot(
        accounts: &[Account],
        subscriptions: &[Subscription],
        monthly_income_usd: f64,
        fx_rate: f64,
    ) -> ForecastResult {
        let mut total_assets_usd = 0.0;
        let mut total_liabilities_usd = 0.0;
        let mut monthly_debt_service_usd = 0.0;

        for acc in accounts {
            let bal_usd = match acc.currency {
                Currency::USD => acc.balance,
                Currency::INR => acc.balance / fx_rate,
            };

            let min_pay_usd = acc.monthly_min_payment.unwrap_or(0.0);
            let min_pay_norm = match acc.currency {
                Currency::USD => min_pay_usd,
                Currency::INR => min_pay_usd / fx_rate,
            };

            match acc.account_type {
                AccountType::CashChecking
                | AccountType::CashSavings
                | AccountType::InvestmentStock
                | AccountType::InvestmentMutualFund
                | AccountType::InvestmentCrypto
                | AccountType::IndianPPF
                | AccountType::IndianEPF
                | AccountType::IndianLICPolicy => {
                    total_assets_usd += bal_usd;
                }
                AccountType::CreditCardAmex
                | AccountType::CreditCardApple
                | AccountType::LoanAuto
                | AccountType::LoanStudent
                | AccountType::LoanPersonal
                | AccountType::LoanMortgage => {
                    total_liabilities_usd += bal_usd.abs();
                    monthly_debt_service_usd += min_pay_norm;
                }
                AccountType::SplitwiseNetBalance => {
                    if bal_usd >= 0.0 {
                        total_assets_usd += bal_usd;
                    } else {
                        total_liabilities_usd += bal_usd.abs();
                    }
                }
            }
        }

        let mut monthly_subscription_cost_usd = 0.0;
        for sub in subscriptions {
            let cost_usd = match sub.currency {
                Currency::USD => sub.cost_per_cycle,
                Currency::INR => sub.cost_per_cycle / fx_rate,
            };
            if sub.cycle.to_lowercase().contains("annual") {
                monthly_subscription_cost_usd += cost_usd / 12.0;
            } else {
                monthly_subscription_cost_usd += cost_usd;
            }
        }

        let net_worth_usd = total_assets_usd - total_liabilities_usd;
        let net_worth_inr = net_worth_usd * fx_rate;

        let monthly_burn_usd = monthly_debt_service_usd + monthly_subscription_cost_usd;
        let monthly_surplus_usd = monthly_income_usd - monthly_burn_usd;

        let mut projected_12m_curve = Vec::new();
        let mut running = net_worth_usd;
        for _ in 1..=12 {
            running += monthly_surplus_usd;
            projected_12m_curve.push((running * 100.0).round() / 100.0);
        }

        ForecastResult {
            current_net_worth_usd: (net_worth_usd * 100.0).round() / 100.0,
            current_net_worth_inr: (net_worth_inr * 100.0).round() / 100.0,
            total_assets_usd: (total_assets_usd * 100.0).round() / 100.0,
            total_liabilities_usd: (total_liabilities_usd * 100.0).round() / 100.0,
            monthly_inflow_usd: monthly_income_usd,
            monthly_burn_usd: (monthly_burn_usd * 100.0).round() / 100.0,
            monthly_surplus_usd: (monthly_surplus_usd * 100.0).round() / 100.0,
            annual_subscription_drag_usd: ((monthly_subscription_cost_usd * 12.0) * 100.0).round() / 100.0,
            projected_12m_curve_usd: projected_12m_curve,
        }
    }
}
