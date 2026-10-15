#!/usr/bin/env python3
import sqlite3
import os

DB_PATH = os.path.expanduser("/Users/abhishek/aio-wealth-hub/aio_wealth.sqlite")

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Verified Accounts to Ingest / Update
    accounts_to_upsert = [
        (
            "us-citi-diamond-6617",
            "Citi Diamond Preferred Card (***6617)",
            "CreditCardCiti",
            "USD",
            6653.49,
            0.0,
            0.0,
            "Citibank (Limit: $8,900.00 | Equifax FICO: 708)"
        ),
        (
            "us-pnc-spend-7558",
            "PNC Virtual Wallet Student Spend (***7558)",
            "CashChecking",
            "USD",
            661.54,
            0.0,
            0.0,
            "PNC Bank"
        ),
        (
            "us-robinhood-brokerage",
            "Robinhood Individual Brokerage",
            "InvestmentStock",
            "USD",
            3381.42,
            0.0,
            0.0,
            "Robinhood Financial"
        ),
        (
            "in-sbi-savings-6073",
            "SBI Savings Account (***6073)",
            "CashSavings",
            "INR",
            250000.00,
            3.0,
            0.0,
            "State Bank of India (Remittance Destination)"
        ),
        (
            "us-paypal-balance",
            "PayPal Digital Wallet",
            "CashChecking",
            "USD",
            0.0,
            0.0,
            0.0,
            "PayPal Inc."
        )
    ]

    for acc_id, name, acc_type, curr, bal, apr, min_pay, inst in accounts_to_upsert:
        cur.execute("""
            INSERT INTO accounts (id, name, account_type, currency, balance, apr, monthly_min_payment, institution, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                account_type = excluded.account_type,
                currency = excluded.currency,
                balance = excluded.balance,
                apr = excluded.apr,
                monthly_min_payment = excluded.monthly_min_payment,
                institution = excluded.institution,
                updated_at = excluded.updated_at
        """, (acc_id, name, acc_type, curr, bal, apr, min_pay, inst))
        print(f"Upserted account: {name} (${bal:,.2f} {curr})")

    # 2. Verified Remittances & Cross-Border Transfers to Ingest
    remittances = [
        (
            "remitly-txn-2026-09-08",
            "in-sbi-savings-6073",
            "2026-09-08",
            150000.00,
            "INR",
            "Remitly -> SBI (••••6073)",
            "Transfer:Remittance",
            0,
            "Remitly US to India Bank Deposit Delivered | Recipient: Abhishek Thakur | FX: 1 USD = 94.69 INR | Jev conf: 0.995"
        ),
        (
            "remitly-txn-2026-08-12",
            "in-sbi-savings-6073",
            "2026-08-12",
            100001.62,
            "INR",
            "Remitly -> SBI (••••6073)",
            "Transfer:Remittance",
            0,
            "Remitly US to India Bank Deposit Delivered | Recipient: Abhishek Thakur | Jev conf: 0.995"
        ),
        (
            "crobo-txn-1",
            "us-checking-609",
            "2026-10-10",
            1700.00,
            "USD",
            "Crobo.money -> Abhishek Thakur",
            "Transfer:Remittance",
            0,
            "Crobo US to India transfer | FX Rate: 94.93 INR/USD | Received in India | Jev conf: 0.995"
        ),
        (
            "crobo-txn-2",
            "us-checking-609",
            "2026-09-25",
            1126.00,
            "USD",
            "Crobo.money -> Abhishek Thakur",
            "Transfer:Remittance",
            0,
            "Crobo US to India transfer | FX Rate: 94.93 INR/USD | Jev conf: 0.995"
        ),
        (
            "crobo-txn-3",
            "us-checking-609",
            "2026-09-15",
            2233.14,
            "USD",
            "Crobo.money -> Abhishek Thakur",
            "Transfer:Remittance",
            0,
            "Crobo US to India transfer | FX Rate: 94.93 INR/USD | Jev conf: 0.995"
        ),
        (
            "crobo-txn-4",
            "us-checking-609",
            "2026-08-30",
            1681.61,
            "USD",
            "Crobo.money -> Abhishek Thakur",
            "Transfer:Remittance",
            0,
            "Crobo US to India transfer | FX Rate: 94.93 INR/USD | Jev conf: 0.995"
        ),
        (
            "crobo-txn-5",
            "us-checking-609",
            "2026-08-15",
            1709.21,
            "USD",
            "Crobo.money -> Abhishek Thakur",
            "Transfer:Remittance",
            0,
            "Crobo US to India transfer | FX Rate: 94.93 INR/USD | Jev conf: 0.995"
        )
    ]

    for tx_id, acc_id, dt, amt, curr, merch, cat, rec, notes in remittances:
        cur.execute("""
            INSERT INTO transactions (id, account_id, date, amount, currency, merchant, category, is_recurring, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                amount = excluded.amount,
                currency = excluded.currency,
                merchant = excluded.merchant,
                category = excluded.category,
                is_recurring = excluded.is_recurring,
                notes = excluded.notes
        """, (tx_id, acc_id, dt, amt, curr, merch, cat, rec, notes))
        print(f"Ingested remittance: {merch} ({amt} {curr})")

    conn.commit()

    # Query summary
    cur.execute("SELECT count(*) FROM accounts")
    total_accs = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM transactions")
    total_txs = cur.fetchone()[0]

    print(f"\nLedger updated successfully: {total_accs} verified accounts, {total_txs} total transactions.")
    conn.close()

if __name__ == "__main__":
    main()
