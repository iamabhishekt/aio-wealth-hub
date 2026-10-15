#!/usr/bin/env python3
import sqlite3
import json
import urllib.request
import os

DB_PATH = os.path.expanduser("/Users/abhishek/aio-wealth-hub/aio_wealth.sqlite")

TOKEN = "eyJraWQiOiJvaWRjLXByb2QtMTc4OTQ0NDgwMCIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwME05TFFGN0xXNENPQUZSMktPWSIsIm1mYV9waG9uZV9udW1iZXIiOiIrMTg2MjIxNTE0MjIiLCJodHRwOi8vcGF5eC5jb20vc3ViIjoiZmxleHwwME05TFFGN0xXNENPQUZSMktPWSIsImlzcyI6Imh0dHBzOi8vb2lkYy5mbGV4LnBheWNoZXguY29tIiwiZGF0YWNlbnRlciI6ImhkYyIsImF1ZCI6WyJmbGV4LnBheWNoZXguY29tIiwiaHR0cHM6Ly9teWFwcHMucGF5Y2hleC5jb20iLCJteWFwcHMucGF5Y2hleC5jb20iXSwiYXpwIjoiODdhMDBjYWYtMDcwYi00ZGJhLTk5NDUtMTZhNzNlM2ZmOTM3IiwiY29uc3VtZXJJbmRpY2F0b3IiOiJjbHQiLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGZsZXgtdWkgbGF1bmNoLWZsZXgiLCJhdXRoX3RpbWUiOjE3OTIwMzU2NDEsImV4cCI6MTc5MjAzNzE0NywiaWF0IjoxNzkyMDM1NjQ4LCJqdGkiOiJmMDk0NGJlMy05YjZiLTQ4OGMtOGVjMi1jYzYxM2E5OWEzMjUifQ.Tai8d0KJDIntX8fTZeFOxl-lvrAyVp9oiLBRXIc23HOBS4pkKrIGa-WXscAeeTCs7z18ikJ16f75n2vRnoepr6qbES4ZSo_U_MiKbY68mqGMfbXuERgTPwgtHxC1TpmyPMa_eJiXMvdyTzBJ3FqP_O8LvBxR5OebSHNb3acjxHdSh814uZUyyyTB9PefVcPdczk9f8zjWD3XbRnm4cLqU7KEKw7BaQd2AJwHO_TEVxSxU0vcSAY62Ryvyjg2SCpvRoIj0ZaRdJ3wKhiH392UsuxuUgCU7xO9_k52z2UQgn9mhB-zIsKe_Ud7pCUqEGBpLxsSelQ0h1iXAUqeDqk-ZA"

HEADERS = {
    "authorization": f"Bearer {TOKEN}",
    "x-payx-sid": "222b06ab-f591-4b34-98eb-3d36d49acbad",
    "x-payx-cnsmr": "PaychexFlex",
    "x-payx-comp": "PaychexFlex",
    "x-payx-user-untrusted": "abhishekLimosys",
    "accept": "application/vnd.paychex.com+v1+json",
    "content-type": "application/vnd.paychex.com+v1+json"
}

def classify_with_jev(merchant, amount, currency, notes=""):
    m = (merchant or "").lower()
    n = (notes or "").lower()

    if any(k in m for k in ["limosys", "paychex", "salary", "payroll"]) or any(k in n for k in ["salary", "payroll"]):
        return {
            "category": "Income:Salary",
            "subcategory": "Direct Deposit / W2 Payroll",
            "confidence": 0.999,
            "is_recurring": 1
        }
    if "toyota" in m or "camry" in n or (amount == 713.52 and currency == "USD"):
        return {
            "category": "Debt:AutoLoan",
            "subcategory": "Auto Financing / Lease",
            "confidence": 0.995,
            "is_recurring": 1
        }
    if "hdfc" in m and any(k in n or k in m for k in ["home loan", "mortgage", "loan"]) or amount > 100000:
        return {
            "category": "Debt:Mortgage",
            "subcategory": "Residential Home Loan",
            "confidence": 0.992,
            "is_recurring": 1
        }
    if any(k in m for k in ["verizon", "pseg", "jio", "airtel", "fios"]):
        return {
            "category": "Expense:Utility",
            "subcategory": "Mobile Prepaid/Postpaid" if ("jio" in m or "airtel" in m) else "Home Internet & Electricity",
            "confidence": 0.989,
            "is_recurring": 1
        }
    if any(k in m for k in ["progressive", "lic", "insurance", "geico"]):
        return {
            "category": "Expense:Insurance",
            "subcategory": "Vehicle / Life Coverage",
            "confidence": 0.985,
            "is_recurring": 1
        }
    if any(k in m for k in ["netflix", "hotstar", "spotify", "google play", "apple.com/bill"]):
        return {
            "category": "Expense:Subscription",
            "subcategory": "Streaming & Digital Media",
            "confidence": 0.978,
            "is_recurring": 1
        }
    if any(k in m for k in ["cams", "cdsl", "nippon", "mutual fund", "zerodha", "groww"]):
        return {
            "category": "Asset:Investment",
            "subcategory": "Equity Mutual Funds / SIP",
            "confidence": 0.991,
            "is_recurring": 1
        }
    if "chase" in m or "credit" in m:
        return {
            "category": "Expense:CreditCard",
            "subcategory": "Credit Card Payment / Alert",
            "confidence": 0.950,
            "is_recurring": 0
        }
    return {
        "category": "Expense:General",
        "subcategory": "Discretionary / Unclassified",
        "confidence": 0.750,
        "is_recurring": 0
    }

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Ensure Checking 609 account exists
    cur.execute("SELECT id FROM accounts WHERE id = 'us-checking-609'")
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO accounts (id, name, account_type, currency, balance, apr, monthly_min_payment, institution, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, ("us-checking-609", "Direct Deposit Checking (***609)", "DepositoryChecking", "USD", 1210.02, 0.0, 0.0, "Paychex Direct Deposit (Limosys LLC)"))
        print("Created account 'us-checking-609'")

    # 2. Fetch 2026 checks
    print("Fetching 2026 paychecks from Paychex API...")
    url2026 = "https://benefits.flex.paychex.com/rest/checkStubs/do/companies/001GJICFLVMBTOYIE3JT/users/00M9LQF7LW4COAFR2KOY/checkstubs?startdate=2026-01-01&enddate=2026-12-31&offset=0&limit=60&consumer=list"
    data2026 = fetch_json(url2026)
    checks2026 = data2026.get("content", [])
    print(f"Retrieved {len(checks2026)} checks for 2026.")

    # Fetch 2025 checks
    checks2025 = []
    try:
        url2025 = "https://benefits.flex.paychex.com/rest/checkStubs/do/companies/001GJICFLVMBTOYIE3JT/users/00M9LQF7LW4COAFR2KOY/checkstubs?startdate=2025-01-01&enddate=2025-12-31&offset=0&limit=60&consumer=list"
        data2025 = fetch_json(url2025)
        checks2025 = data2025.get("content", [])
        print(f"Retrieved {len(checks2025)} checks for 2025.")
    except Exception as e:
        print(f"2025 checks fetch note: {e}")

    all_checks = checks2026 + checks2025
    print(f"Total checks to ingest: {len(all_checks)}")

    inserted = 0
    for c in all_checks:
        stub_id = c.get("stubId") or c.get("checkNumber")
        pay_date = c.get("payDate")
        net_pay = float(c.get("netPay", 0.0))
        check_num = c.get("checkNumber", "")
        p_start = c.get("periodStart", "")
        p_end = c.get("periodEnd", "")
        tx_id = f"paychex-check-{stub_id}-{pay_date}"

        jev = classify_with_jev("Limosys LLC / Paychex Salary", net_pay, "USD", f"Check #{check_num} Period: {p_start} to {p_end}")

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
        """, (
            tx_id,
            "us-checking-609",
            pay_date,
            net_pay,
            "USD",
            "Limosys LLC (Payroll)",
            jev["category"],
            jev["is_recurring"],
            f"Paychex Check #{check_num} | Period: {p_start} to {p_end} | Jev confidence: {jev['confidence']}"
        ))
        inserted += 1

    conn.commit()
    print(f"Successfully inserted/updated {inserted} payroll records into transactions table.")

    # 3. Apply Jev Classification to all other transactions in SQLite
    print("\nApplying Jev Classification to all existing transactions...")
    cur.execute("SELECT id, merchant, amount, currency, notes FROM transactions WHERE id NOT LIKE 'paychex%'")
    rows = cur.fetchall()
    reclassified = 0
    for row in rows:
        tid, merch, amt, curr, notes = row
        jev = classify_with_jev(merch, amt, curr, notes)
        clean_notes = (notes or "").split(" | Jev:")[0].strip()
        updated_notes = f"{clean_notes} | Jev:{jev['subcategory']} (conf:{jev['confidence']})"
        cur.execute("""
            UPDATE transactions
            SET category = ?, is_recurring = ?, notes = ?
            WHERE id = ?
        """, (jev["category"], jev["is_recurring"], updated_notes, tid))
        reclassified += 1

    conn.commit()
    print(f"Reclassified {reclassified} existing transactions with Jev Chart of Accounts.")

    # 4. Print Summary
    cur.execute("""
        SELECT category, count(*) as count, round(sum(amount), 2) as total, currency
        FROM transactions
        GROUP BY category, currency
        ORDER BY count DESC
    """)
    summary = cur.fetchall()
    print("\n=== Comprehensive Jev Ledger Breakdown ===")
    print(f"{'Category':<22} | {'Count':<6} | {'Total':<14} | {'Currency':<6}")
    print("-" * 55)
    for cat, cnt, tot, curr in summary:
        print(f"{cat:<22} | {cnt:<6} | {tot:<14} | {curr:<6}")

    conn.close()

if __name__ == "__main__":
    main()
