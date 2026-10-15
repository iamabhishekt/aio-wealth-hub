#!/usr/bin/env python3
"""
SimpleFIN Ingestion Engine for AIO Wealth Hub
Ingests all connected live accounts, real balances, stock holdings, and transactions
into aio_wealth.sqlite with Jev Chart of Accounts classification.
"""

import os
import json
import sqlite3
import urllib.request
import urllib.parse
import base64
from datetime import datetime, timezone

DB_PATH = os.path.expanduser("~/aio-wealth-hub/aio_wealth.sqlite")
ENV_PATH = os.path.expanduser("~/aio-wealth-hub/.env")

def get_access_url():
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r") as f:
            for line in f:
                if line.startswith("SIMPLEFIN_ACCESS_URL="):
                    return line.strip().split("=", 1)[1].strip('"').strip("'")
    return None

def init_db(conn):
    cur = conn.cursor()
    # Create holdings table for investment allocations
    cur.execute("""
        CREATE TABLE IF NOT EXISTS holdings (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            description TEXT,
            shares REAL NOT NULL,
            purchase_price REAL,
            market_value REAL NOT NULL,
            currency TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    conn.commit()

def sync():
    access_url = get_access_url()
    if not access_url:
        print("[ERROR] No SIMPLEFIN_ACCESS_URL configured.")
        return

    import urllib.parse
    import base64

    # Fetch 90 days of transactions (Unix timestamp ~90 days ago)
    start_date_ts = int(datetime.now().timestamp()) - (90 * 86400)
    parsed = urllib.parse.urlparse(access_url)
    user_pass = f"{parsed.username}:{parsed.password}"
    auth_b64 = base64.b64encode(user_pass.encode()).decode()
    clean_url = f"{parsed.scheme}://{parsed.hostname}{parsed.path}/accounts?version=2&start-date={start_date_ts}"

    print(f"[SimpleFIN] Querying live accounts from bridge: {clean_url}...")
    req = urllib.request.Request(clean_url, headers={
        "User-Agent": "AIO-Wealth-Hub/1.0",
        "Authorization": f"Basic {auth_b64}"
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    cur = conn.cursor()

    accounts = data.get("accounts", [])
    print(f"[SimpleFIN] Fetched {len(accounts)} accounts from bridge.")

    for acc in accounts:
        acc_id = acc.get("id")
        name = acc.get("name", "Account")
        org_name = acc.get("org", {}).get("name", "Financial Institution")
        currency = acc.get("currency", "USD")
        raw_balance = float(acc.get("balance", "0.00"))
        
        # Determine account type and balance interpretation
        name_lower = name.lower()
        org_lower = org_name.lower()

        if "camry" in name_lower or "toyota" in org_lower:
            acc_type = "LoanAuto"
            balance = abs(raw_balance) # Store liability principal as positive liability balance
            apr = 5.99
            monthly_min = 713.52
        elif "card" in name_lower or "platinum" in name_lower or "sapphire" in name_lower or "preferred" in name_lower or "citi" in org_lower:
            if "citi" in org_lower:
                acc_type = "CreditCardCiti"
                apr = 0.0
            elif "american express" in org_lower or "amex" in org_lower:
                acc_type = "CreditCardAmex"
                apr = 24.99
            elif "chase" in org_lower:
                acc_type = "CreditCardChase"
                apr = 22.49
            else:
                acc_type = "CreditCardGeneric"
                apr = 21.0
            balance = abs(raw_balance)
            monthly_min = 45.0
        elif "robinhood" in org_lower or "crypto" in name_lower:
            acc_type = "InvestmentStock"
            balance = raw_balance
            apr = None
            monthly_min = None
        elif "401(k)" in name_lower or "paychex" in org_lower:
            acc_type = "Investment401k"
            balance = raw_balance
            apr = None
            monthly_min = None
        elif "checking" in name_lower or "spend" in name_lower or "college" in name_lower:
            acc_type = "CashChecking"
            balance = raw_balance
            apr = None
            monthly_min = None
        elif "saving" in name_lower or "reserve" in name_lower or "growth" in name_lower:
            acc_type = "CashSavings"
            balance = raw_balance
            apr = 4.40 if "marcus" in org_lower else None
            monthly_min = None
        else:
            acc_type = "CashChecking"
            balance = raw_balance
            apr = None
            monthly_min = None

        now_str = datetime.now(timezone.utc).isoformat()

        # Clean display name
        display_name = f"{name} ({org_name})" if org_name not in name else name

        # Upsert account
        cur.execute("""
            INSERT INTO accounts (id, name, account_type, currency, balance, apr, monthly_min_payment, institution, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                balance = excluded.balance,
                apr = excluded.apr,
                monthly_min_payment = excluded.monthly_min_payment,
                updated_at = excluded.updated_at;
        """, (
            acc_id,
            display_name,
            acc_type,
            currency,
            balance,
            apr,
            monthly_min,
            org_name,
            now_str
        ))

        # Ingest Holdings (for Robinhood / Brokerage)
        holdings = acc.get("holdings", [])
        for h in holdings:
            h_id = h.get("id")
            symbol = h.get("symbol") or h.get("description", "ASSET")[:10]
            desc = h.get("description", "")
            shares = float(h.get("shares", 0.0))
            purchase_price = float(h.get("purchase_price", 0.0))
            market_val = float(h.get("market_value", 0.0))
            h_currency = h.get("currency") or "USD"

            cur.execute("""
                INSERT INTO holdings (id, account_id, symbol, description, shares, purchase_price, market_value, currency, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    shares = excluded.shares,
                    purchase_price = excluded.purchase_price,
                    market_value = excluded.market_value,
                    updated_at = excluded.updated_at;
            """, (h_id, acc_id, symbol, desc, shares, purchase_price, market_val, h_currency, now_str))

        # Ingest Transactions
        txs = acc.get("transactions", [])
        for t in txs:
            tx_id = t.get("id")
            posted_ts = t.get("posted", int(datetime.now().timestamp()))
            date_str = datetime.fromtimestamp(posted_ts, timezone.utc).strftime("%Y-%m-%d")
            amount = float(t.get("amount", 0.0))
            merchant = t.get("payee") or t.get("description") or "Unknown"
            memo = t.get("memo") or ""

            # Jev Chart of Accounts classification
            m_lower = merchant.lower()
            if "payroll" in m_lower or "paychex" in m_lower or "direct dep" in m_lower:
                category = "Income:Payroll"
            elif "toyota" in m_lower:
                category = "Liabilities:AutoLoan"
            elif "remitly" in m_lower or "crobo" in m_lower or "xoom" in m_lower:
                category = "Transfer:Remittance"
            elif "costco" in m_lower or "trader" in m_lower or "whole foods" in m_lower:
                category = "Expense:Groceries"
            elif "pseg" in m_lower or "verizon" in m_lower or "t-mobile" in m_lower:
                category = "Expense:Utilities"
            elif "online transfer" in m_lower or "payment" in m_lower:
                category = "Transfer:Internal"
            else:
                category = "Expense:General"

            cur.execute("""
                INSERT INTO transactions (id, account_id, date, amount, currency, merchant, category, is_recurring, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    amount = excluded.amount,
                    merchant = excluded.merchant,
                    category = excluded.category;
            """, (tx_id, acc_id, date_str, amount, currency, merchant, category, 0, memo))

    conn.commit()
    conn.close()
    print("[SimpleFIN] Ingestion completed successfully.")

if __name__ == "__main__":
    sync()
