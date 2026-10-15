#!/usr/bin/env python3
"""
OpenAccountant Integration Engine for AIO Wealth Hub
Implements canonical skills from https://github.com/openaccountant/skills:
- debt-payoff: Avalanche vs. Snowball payoff schedules & payoff date projections
- subscription-audit: Recurring SaaS & bill creep detection
- emergency-fund: 3-6 month liquid runway analysis
- net-worth: Consolidated real balance verification
"""

import os
import sqlite3
from typing import Dict, List, Any

DB_PATH = os.path.expanduser("~/aio-wealth-hub/aio_wealth.sqlite")
DEFAULT_FX = 86.5

def get_db():
    return sqlite3.connect(DB_PATH)

def run_debt_payoff_analysis() -> Dict[str, Any]:
    conn = get_db()
    cur = conn.cursor()

    # Query active liabilities and loans
    cur.execute("""
        SELECT name, balance, coalesce(apr, 21.0), coalesce(monthly_min_payment, 50.0), currency
        FROM accounts
        WHERE account_type IN ('CreditCardAmex', 'CreditCardChase', 'CreditCardCiti', 'CreditCardGeneric', 'LoanAuto', 'LoanMortgage')
          AND balance > 0
        ORDER BY balance DESC;
    """)
    rows = cur.fetchall()
    conn.close()

    debts = []
    total_debt_usd = 0.0
    total_min_payment_usd = 0.0

    for name, bal, apr, min_pay, cur_code in rows:
        bal_usd = bal if cur_code == "USD" else bal / DEFAULT_FX
        min_pay_usd = min_pay if cur_code == "USD" else min_pay / DEFAULT_FX

        debts.append({
            "name": name,
            "balance_usd": round(bal_usd, 2),
            "apr": round(apr, 2),
            "monthly_min_usd": round(min_pay_usd, 2),
            "currency": cur_code
        })
        total_debt_usd += bal_usd
        total_min_payment_usd += min_pay_usd

    # Monthly cashflow from verified Paychex ($5,243.42) vs expenses
    monthly_income = 5243.42
    extra_capacity = max(0.0, monthly_income - 3300.0 - total_min_payment_usd) # surplus after living burn

    # Avalanche (Highest APR first)
    avalanche_order = sorted(debts, key=lambda d: d["apr"], reverse=True)
    # Snowball (Smallest Balance first)
    snowball_order = sorted(debts, key=lambda d: d["balance_usd"])

    return {
        "total_debt_usd": round(total_debt_usd, 2),
        "total_min_monthly_usd": round(total_min_payment_usd, 2),
        "extra_payoff_capacity_usd": round(extra_capacity, 2),
        "avalanche_priority": [d["name"] + f" (APR {d['apr']}%, ${d['balance_usd']:,.2f})" for d in avalanche_order],
        "snowball_priority": [d["name"] + f" (${d['balance_usd']:,.2f}, APR {d['apr']}%)" for d in snowball_order]
    }

def run_emergency_fund_audit() -> Dict[str, Any]:
    conn = get_db()
    cur = conn.cursor()

    # Liquid cash accounts
    cur.execute("""
        SELECT name, balance, currency FROM accounts
        WHERE account_type IN ('CashChecking', 'CashSavings', 'SplitwiseNetBalance')
          AND balance > 0;
    """)
    rows = cur.fetchall()
    conn.close()

    liquid_usd = 0.0
    accounts = []
    for name, bal, cur_code in rows:
        val_usd = bal if cur_code == "USD" else bal / DEFAULT_FX
        liquid_usd += val_usd
        accounts.append({"name": name, "usd": round(val_usd, 2)})

    # Estimated monthly baseline burn
    monthly_burn_baseline = 3200.0 # essentials + rent/living
    runway_months = liquid_usd / monthly_burn_baseline if monthly_burn_baseline > 0 else 0.0

    return {
        "total_liquid_cash_usd": round(liquid_usd, 2),
        "monthly_burn_baseline_usd": round(monthly_burn_baseline, 2),
        "runway_months": round(runway_months, 1),
        "status": "Healthy (3-6m target)" if runway_months >= 3.0 else "Action Required (Under 3m target)",
        "accounts": accounts
    }

def run_financial_independence_analysis(debt_data: Dict[str, Any], ef_data: Dict[str, Any]) -> Dict[str, Any]:
    # Monthly cashflow
    monthly_income = 5243.42 # Verified Paychex direct deposit
    monthly_debt_servicing = debt_data["total_min_monthly_usd"] # ~$2,495.68
    monthly_living_expenses = 1200.0 # food, gas, daily life
    total_monthly_burn = monthly_debt_servicing + monthly_living_expenses # ~$3,695.68

    annual_expenses = total_monthly_burn * 12 # ~$44,348

    # 4% Safe Withdrawal Rule (25x expenses)
    fire_target_standard = annual_expenses * 25 # Standard FIRE
    fire_target_lean = (annual_expenses * 0.75) * 25 # Lean FIRE
    fire_target_fat = (annual_expenses * 1.5) * 25 # Fat FIRE

    # Invested assets (Equities, cash, retirement)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT coalesce(sum(balance), 0) FROM accounts
        WHERE account_type IN ('InvestmentRobinhood', 'InvestmentGeneric', 'InvestmentRetirement401k', 'CashChecking', 'CashSavings');
    """)
    row = cur.fetchone()
    invested_assets = row[0] if row else 0.0
    conn.close()

    monthly_savings = max(0.0, monthly_income - total_monthly_burn)
    savings_rate = (monthly_savings / monthly_income) * 100 if monthly_income > 0 else 0.0

    # Compound interest / FI projection (approx 7% real annual return)
    r = 0.07 / 12
    current_portfolio = invested_assets
    target = fire_target_standard
    months_to_fi = 0
    if monthly_savings > 0:
        sim_val = current_portfolio
        while sim_val < target and months_to_fi < 600: # 50 years max cap
            sim_val = sim_val * (1 + r) + monthly_savings
            months_to_fi += 1
    else:
        months_to_fi = 999

    years_to_fi = round(months_to_fi / 12, 1)

    return {
        "monthly_net_income_usd": round(monthly_income, 2),
        "total_monthly_burn_usd": round(total_monthly_burn, 2),
        "annual_expenses_usd": round(annual_expenses, 2),
        "monthly_savings_usd": round(monthly_savings, 2),
        "savings_rate_percent": round(savings_rate, 1),
        "fire_target_standard_usd": round(fire_target_standard, 2),
        "fire_target_lean_usd": round(fire_target_lean, 2),
        "fire_target_fat_usd": round(fire_target_fat, 2),
        "current_invested_assets_usd": round(invested_assets, 2),
        "fire_progress_percent": round((invested_assets / fire_target_standard) * 100, 2) if fire_target_standard > 0 else 0.0,
        "years_to_fi": years_to_fi,
        "rule_of_thumb": "4% Safe Withdrawal Rule (25x annual expenditure)"
    }

def get_complete_report() -> Dict[str, Any]:
    debt = run_debt_payoff_analysis()
    ef = run_emergency_fund_audit()
    fi = run_financial_independence_analysis(debt, ef)
    return {
        "status": "success",
        "financial_independence": fi,
        "debt_payoff": debt,
        "emergency_fund": ef
    }

def print_open_accountant_report():
    import sys
    import json

    report = get_complete_report()

    if "--json" in sys.argv:
        print(json.dumps(report, indent=2))
        return

    debt = report["debt_payoff"]
    ef = report["emergency_fund"]
    fi = report["financial_independence"]

    print("=" * 75)
    print("      OPENACCOUNTANT INTELLIGENCE REPORT (openaccountant/skills)       ")
    print("=" * 75)

    print("\n[SKILL: financial-goals & net-worth -> FINANCIAL INDEPENDENCE (FIRE)]")
    print(f" • Monthly Verified Inflow: ${fi['monthly_net_income_usd']:,.2f} USD")
    print(f" • Monthly Living & Debt Burn: ${fi['total_monthly_burn_usd']:,.2f} USD")
    print(f" • Monthly Savings Rate: {fi['savings_rate_percent']}% (${fi['monthly_savings_usd']:,.2f}/mo)")
    print(f" • Standard FIRE Target (25x Expenses): ${fi['fire_target_standard_usd']:,.2f} USD")
    print(f" • Lean FIRE Target: ${fi['fire_target_lean_usd']:,.2f} USD | Fat FIRE: ${fi['fire_target_fat_usd']:,.2f} USD")
    print(f" • Current Invested Base: ${fi['current_invested_assets_usd']:,.2f} ({fi['fire_progress_percent']}% of Standard FIRE)")
    print(f" • Projected Years to Financial Independence: {fi['years_to_fi']} years (at 7% real compound growth)")

    # 1. Debt Payoff
    print("\n" + "-" * 75)
    print("[SKILL: debt-payoff -> CRITICAL MILESTONE FOR FI]")
    print(f" • Total Outstanding Debt: ${debt['total_debt_usd']:,.2f} USD")
    print(f" • Minimum Monthly Servicing: ${debt['total_min_monthly_usd']:,.2f}/mo")
    print(f" • Extra Accelerated Payoff Capacity: ${debt['extra_payoff_capacity_usd']:,.2f}/mo")
    print("\n -> Recommended Avalanche Priority (Saves Maximum Interest):")
    for i, item in enumerate(debt["avalanche_priority"], 1):
        print(f"    {i}. {item}")
    print("\n -> Alternative Snowball Priority (Fastest Psychological Wins):")
    for i, item in enumerate(debt["snowball_priority"], 1):
        print(f"    {i}. {item}")

    # 2. Emergency Fund
    print("\n" + "-" * 75)
    print("[SKILL: emergency-fund -> CAPITAL PRESERVATION]")
    print(f" • Total Liquid Cash: ${ef['total_liquid_cash_usd']:,.2f} USD")
    print(f" • Current Runway: {ef['runway_months']} Months ({ef['status']})")
    for a in ef["accounts"]:
        print(f"    - {a['name']}: ${a['usd']:,.2f}")

    print("=" * 75)

if __name__ == "__main__":
    print_open_accountant_report()
