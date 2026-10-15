#!/usr/bin/env python3
"""
Jev LLM Classifier for AIO Wealth Hub (via TypeSafe.ai SystemOne API)
Performs strict, type-safe Chart of Accounts double-entry classification
with confidence metrics and probability scoring.
"""

import os
import json
import sqlite3
import urllib.request
from typing import Dict, Any, Optional

DB_PATH = os.path.expanduser("~/aio-wealth-hub/aio_wealth.sqlite")
ENV_PATH = os.path.expanduser("~/aio-wealth-hub/.env")

CHART_OF_ACCOUNTS_CRITERIA = {
    "Income:Payroll": "Salary, employer wages, payroll direct deposits, paychex",
    "Expense:Groceries": "Supermarkets, warehouse wholesale clubs, food markets, Trader Joe's, Costco, Whole Foods",
    "Expense:Dining": "Restaurants, takeout, fast food, coffee shops, cafes, bars, UberEats, DoorDash",
    "Expense:Utilities": "Electric, gas, water, internet, cell phone bills, Verizon, PSEG, Jio, Airtel, T-Mobile",
    "Expense:Transport": "Gas stations, public transit, tollways, parking, Uber, Lyft",
    "Expense:Subscriptions": "Streaming entertainment, cloud storage, SaaS apps, Netflix, Google One, Apple, Spotify",
    "Liabilities:AutoLoan": "Car payments, vehicle financing, Toyota Financial Services",
    "Liabilities:Mortgage": "Home loans, mortgage EMIs, property loans, HDFC Home Loan",
    "Transfer:Remittance": "Cross-border transfers, international remittances, Remitly, Crobo, Xoom, India transfers",
    "Transfer:Internal": "Payments between own bank accounts, credit card balance payments, savings transfers",
    "Expense:General": "General shopping, retail merchandise, electronics, clothing, miscellaneous purchases"
}

def get_api_key() -> Optional[str]:
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r") as f:
            for line in f:
                if line.startswith("TYPESAFE_API_KEY="):
                    return line.strip().split("=", 1)[1].strip('"').strip("'")
    return os.environ.get("TYPESAFE_API_KEY")

def classify_merchant_jev(merchant: str, amount: float, currency: str, api_key: str) -> Dict[str, Any]:
    url = "https://api.typesafe.ai/v1/systemone"
    state_str = f"Merchant: {merchant} | Amount: {amount} {currency}"

    payload = {
        "state": state_str,
        "model": "jev-latest",
        "questions": {
            "category": {
                "type": "choice",
                "instructions": "Classify this transaction into the appropriate double-entry Chart of Accounts category.",
                "criteria": CHART_OF_ACCOUNTS_CRITERIA
            }
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "AIO-Wealth-Hub/1.0"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ans = data.get("answers", {}).get("category", {})
            return {
                "choice": ans.get("choice", "Expense:General"),
                "confidence": ans.get("confidence", 1.0)
            }
    except Exception as e:
        print(f"[Jev Error] {e} for '{merchant}'")
        return {"choice": "Expense:General", "confidence": 0.5}

def run_classification(limit: int = 50):
    api_key = get_api_key()
    if not api_key:
        print("[ERROR] TYPESAFE_API_KEY not found in .env")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Get distinct merchants to classify efficiently
    cur.execute("""
        SELECT DISTINCT merchant, currency, amount FROM transactions
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cur.fetchall()

    print(f"[Jev Classifier] Classifying {len(rows)} transactions with TypeSafe Jev LLM...")

    classification_cache = {}
    for merchant, currency, amount in rows:
        if merchant in classification_cache:
            continue

        result = classify_merchant_jev(merchant, amount, currency, api_key)
        classification_cache[merchant] = result
        print(f" -> '{merchant}' => {result['choice']} (confidence: {result['confidence']:.2f})")

        # Update all transactions matching this merchant
        cur.execute("""
            UPDATE transactions
            SET category = ?, notes = coalesce(notes || ' | ', '') || 'Jev LLM (' || ? || ')'
            WHERE merchant = ?
        """, (result["choice"], f"{result['confidence'] * 100:.0f}%", merchant))

    conn.commit()
    conn.close()
    print("[Jev Classifier] Classification batch completed and saved to SQLite.")

if __name__ == "__main__":
    run_classification(100)
