#!/usr/bin/env python3
"""
Wallos Subscription & Bill Tracker Engine for AIO Wealth Hub
Implements the Wallos schema and tracks all recurring bills and subscriptions:
- 2025 Toyota Camry Auto Loan ($713.52/mo)
- HDFC NRI Home Loan EMI (₹142,479/mo)
- Progressive Casualty Auto/Home Insurance
- Costco Wholesale Annual Membership ($65/yr)
- Google Play / Android Subscriptions
- Netflix & Streaming
- Mobile lines (+1-862, +1-917, +91-9820)
"""

import os
import sqlite3
from datetime import datetime, timedelta, timezone

WEALTH_DB = os.path.expanduser("~/aio-wealth-hub/aio_wealth.sqlite")
WALLOS_DB = os.path.expanduser("~/aio-wealth-hub/wallos.db")

def init_wallos_db(conn):
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS currencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            symbol TEXT NOT NULL,
            code TEXT NOT NULL,
            rate REAL NOT NULL
        );
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS payment_methods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            logo TEXT,
            price REAL NOT NULL,
            currency_id INTEGER NOT NULL,
            next_payment DATE NOT NULL,
            cycle TEXT NOT NULL,
            frequency INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            payer_id INTEGER DEFAULT 1,
            payment_method_id INTEGER NOT NULL,
            notes TEXT,
            url TEXT,
            cancellation_date DATE,
            is_active INTEGER DEFAULT 1,
            notify_days_before INTEGER DEFAULT 3,
            notify INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (currency_id) REFERENCES currencies(id),
            FOREIGN KEY (category_id) REFERENCES categories(id),
            FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
        );
    """)

    # Populate default currencies if empty
    cur.execute("SELECT count(*) FROM currencies")
    if cur.fetchone()[0] == 0:
        cur.executemany("""
            INSERT INTO currencies (id, name, symbol, code, rate)
            VALUES (?, ?, ?, ?, ?)
        """, [
            (1, "US Dollar", "$", "USD", 1.0),
            (2, "Indian Rupee", "₹", "INR", 85.05)
        ])

    # Populate categories
    cur.execute("SELECT count(*) FROM categories")
    if cur.fetchone()[0] == 0:
        cur.executemany("""
            INSERT INTO categories (id, name)
            VALUES (?, ?)
        """, [
            (1, "Loans & Debt"),
            (2, "Insurance"),
            (3, "Memberships & Shopping"),
            (4, "Utilities & Phone"),
            (5, "Digital Services & Entertainment")
        ])

    # Populate payment methods
    cur.execute("SELECT count(*) FROM payment_methods")
    if cur.fetchone()[0] == 0:
        cur.executemany("""
            INSERT INTO payment_methods (id, name)
            VALUES (?, ?)
        """, [
            (1, "Amex Rewards Checking x1609"),
            (2, "Chase College Checking x6367"),
            (3, "Citi Diamond Preferred x6617"),
            (4, "SBI Savings Account x6073"),
            (5, "PNC Bank Spend x7558")
        ])

    conn.commit()

def sync_subscriptions():
    conn_wallos = sqlite3.connect(WALLOS_DB)
    init_wallos_db(conn_wallos)
    cur_w = conn_wallos.cursor()

    conn_wealth = sqlite3.connect(WEALTH_DB)
    cur_m = conn_wealth.cursor()

    # Pre-defined verified bills and recurring subscriptions
    now = datetime.now(timezone.utc)
    next_month = (now + timedelta(days=25)).strftime("%Y-%m-%d")
    next_year = (now + timedelta(days=300)).strftime("%Y-%m-%d")

    subscriptions = [
        {
            "id": "bill-toyota-loan",
            "name": "2025 Toyota Camry Auto Loan",
            "price": 713.52,
            "currency_id": 1,
            "cycle": "Monthly",
            "frequency": 1,
            "category_id": 1,
            "payment_method_id": 1, # Amex checking
            "notes": "Toyota Financial Services A/C x1787. Principal: $27,904.37",
            "url": "https://www.toyotafinancial.com",
            "next_payment": next_month
        },
        {
            "id": "bill-hdfc-home-loan",
            "name": "HDFC NRI Home Loan EMI",
            "price": 142479.00,
            "currency_id": 2, # INR
            "cycle": "Monthly",
            "frequency": 1,
            "category_id": 1,
            "payment_method_id": 4, # SBI / Auto-debit
            "notes": "HDFC NRI Loan A/C 703795941. Principal: ₹1,42,55,700",
            "url": "https://portal.hdfc.com",
            "next_payment": next_month
        },
        {
            "id": "bill-costco-membership",
            "name": "Costco Gold Star / Executive Membership",
            "price": 65.00,
            "currency_id": 1,
            "cycle": "Annual",
            "frequency": 1,
            "category_id": 3,
            "payment_method_id": 3, # Citi Card
            "notes": "Annual auto-renewal linked with Citi Card",
            "url": "https://www.costco.com",
            "next_payment": next_year
        },
        {
            "id": "sub-netflix",
            "name": "Netflix Standard Streaming",
            "price": 15.49,
            "currency_id": 1,
            "cycle": "Monthly",
            "frequency": 1,
            "category_id": 5,
            "payment_method_id": 1,
            "notes": "Direct billing",
            "url": "https://www.netflix.com/youraccount",
            "next_payment": next_month
        },
        {
            "id": "sub-google-play",
            "name": "Google Play Apps & Cloud Storage",
            "price": 9.99,
            "currency_id": 1,
            "cycle": "Monthly",
            "frequency": 1,
            "category_id": 5,
            "payment_method_id": 1,
            "notes": "Google Play Subscriptions",
            "url": "https://play.google.com/store/account/subscriptions",
            "next_payment": next_month
        },
        {
            "id": "bill-us-phone-plan",
            "name": "US Mobile Lines (+1862 & +1917)",
            "price": 85.00,
            "currency_id": 1,
            "cycle": "Monthly",
            "frequency": 1,
            "category_id": 4,
            "payment_method_id": 2,
            "notes": "Primary lines +18622151422 and +19175128725",
            "url": "",
            "next_payment": next_month
        },
        {
            "id": "bill-india-sim-annual",
            "name": "India SIM Annual Recharge (+919820171695)",
            "price": 2999.00,
            "currency_id": 2, # INR
            "cycle": "Annual",
            "frequency": 1,
            "category_id": 4,
            "payment_method_id": 4,
            "notes": "Annual unlimited international roaming / validity",
            "url": "",
            "next_payment": next_year
        }
    ]

    print(f"[Wallos] Syncing {len(subscriptions)} recurring bills and subscriptions...")

    for sub in subscriptions:
        # Upsert into Wallos SQLite
        cur_w.execute("""
            INSERT INTO subscriptions (name, price, currency_id, next_payment, cycle, frequency, category_id, payment_method_id, notes, url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sub["name"],
            sub["price"],
            sub["currency_id"],
            sub["next_payment"],
            sub["cycle"],
            sub["frequency"],
            sub["category_id"],
            sub["payment_method_id"],
            sub["notes"],
            sub["url"]
        ))

        # Also mirror into AIO Wealth Hub unified SQLite subscriptions table
        cur_m.execute("""
            INSERT INTO subscriptions (id, service_name, source, cost_per_cycle, currency, cycle, next_renewal, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                cost_per_cycle = excluded.cost_per_cycle,
                cycle = excluded.cycle,
                next_renewal = excluded.next_renewal;
        """, (
            sub["id"],
            sub["name"],
            "Wallos Tracker",
            sub["price"],
            "INR" if sub["currency_id"] == 2 else "USD",
            sub["cycle"],
            sub["next_payment"],
            "Active"
        ))

    conn_wallos.commit()
    conn_wallos.close()

    conn_wealth.commit()
    conn_wealth.close()
    print("[Wallos] Successfully generated wallos.db and updated aio_wealth.sqlite.")

if __name__ == "__main__":
    sync_subscriptions()
