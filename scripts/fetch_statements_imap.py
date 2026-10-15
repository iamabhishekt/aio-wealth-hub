#!/usr/bin/env python3
"""
AIO Wealth Hub - Multi-Gmail & IMAP Statement & Bill Fetcher.
Zero external dependencies (uses standard library imaplib, email, sqlite3, argparse).
Connects securely via IMAP SSL to multiple configured accounts (e.g., US Personal Gmail,
India Financial Gmail), queries bank/utility statements, and downloads statement
attachments directly into the AIO Wealth Hot Folder for instant zero-touch ingestion.
"""

import os
import sys
import argparse
import email
from email.header import decode_header
import imaplib
from pathlib import Path
import sqlite3
import json
from datetime import datetime, timezone

# Default hot folder destination: ~/Documents/AIO-Wealth-Statements
DEFAULT_HOT_FOLDER = Path.home() / "Documents" / "AIO-Wealth-Statements"

# Provider search filters: (Sender Domain, Subject Keywords, Category Tag)
PROVIDER_RULES = [
    ("chase.com", ["statement", "e-statement", "account balance"], "chase"),
    ("pnc.com", ["statement", "account summary"], "pnc"),
    ("americanexpress.com", ["statement", "bill ready"], "amex"),
    ("toyotafinancial.com", ["statement", "bill", "payment due"], "toyota"),
    ("hdfcbank.net", ["statement", "home loan", "loan account"], "hdfc"),
    ("hdfcbank.com", ["statement", "home loan", "loan account"], "hdfc"),
    ("progressive.com", ["bill", "policy", "premium notice"], "progressive"),
    ("pseg.com", ["bill is ready", "energy bill", "pseg bill"], "pseg"),
    ("verizon.com", ["fios", "bill is ready", "verizon statement"], "verizon"),
    ("t-mobile.com", ["statement", "bill is ready", "t-mobile"], "tmobile"),
    ("jio.com", ["invoice", "recharge", "fiber bill"], "jio"),
    ("airtel.com", ["bill", "invoice", "airtel"], "airtel"),
    ("camsonline.com", ["consolidated account statement", "cas"], "cams"),
    ("kfintech.com", ["statement", "cas"], "kfintech"),
    ("netflix.com", ["invoice", "receipt"], "netflix"),
]

def clean_subject(header_val):
    if not header_val:
        return ""
    decoded_parts = decode_header(header_val)
    parts = []
    for content, encoding in decoded_parts:
        if isinstance(content, bytes):
            parts.append(content.decode(encoding or "utf-8", errors="ignore"))
        else:
            parts.append(str(content))
    return " ".join(parts)

def test_imap_connection(server, port, user, password):
    """Tests IMAP authentication without downloading attachments."""
    try:
        mail = imaplib.IMAP4_SSL(server, int(port))
        mail.login(user, password)
        status, _ = mail.select("INBOX", readonly=True)
        mail.logout()
        return {"success": status == "OK", "message": "Successfully authenticated with IMAP server"}
    except Exception as e:
        return {"success": False, "message": str(e)}

def fetch_for_account(account_id, label, email_addr, password, server, port, hot_folder):
    """Fetches statements for a single email account and saves attachments to hot_folder."""
    print(f"[aio-imap-fetcher] [{label}] Connecting to {server}:{port} ({email_addr})...")
    try:
        mail = imaplib.IMAP4_SSL(server, int(port))
        mail.login(email_addr, password)
        mail.select("INBOX", readonly=True)
    except Exception as e:
        print(f"[aio-imap-fetcher] [{label}] Authentication error: {e}", file=sys.stderr)
        return {"account_id": account_id, "label": label, "downloaded": 0, "error": str(e)}

    total_downloaded = 0
    hot_folder.mkdir(parents=True, exist_ok=True)

    for domain, keywords, tag in PROVIDER_RULES:
        search_query = f'(FROM "{domain}")'
        try:
            status, data = mail.search(None, search_query)
        except Exception:
            continue

        if status != "OK" or not data[0]:
            continue

        email_ids = data[0].split()
        # Scan most recent 10 emails from this domain
        for eid in email_ids[-10:]:
            try:
                res, msg_data = mail.fetch(eid, "(RFC822)")
                if res != "OK" or not msg_data:
                    continue

                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)
                subject = clean_subject(msg.get("Subject", "")).lower()

                # Keyword check
                if not any(k in subject for k in keywords):
                    continue

                for part in msg.walk():
                    if part.get_content_maintype() == "multipart":
                        continue
                    filename = part.get_filename()
                    if filename:
                        decoded_fname = clean_subject(filename)
                        ext = Path(decoded_fname).suffix.lower()

                        if ext in [".pdf", ".csv", ".ofx", ".qfx"]:
                            safe_name = f"{tag}_{decoded_fname}"
                            target_file = hot_folder / safe_name
                            if not target_file.exists():
                                payload = part.get_payload(decode=True)
                                if payload:
                                    target_file.write_bytes(payload)
                                    total_downloaded += 1
                                    print(f"[aio-imap-fetcher] [{label}] Staged: {safe_name}")
            except Exception as e:
                print(f"[aio-imap-fetcher] [{label}] Error parsing email: {e}", file=sys.stderr)
                continue

    try:
        mail.logout()
    except Exception:
        pass

    print(f"[aio-imap-fetcher] [{label}] Completed: {total_downloaded} statement(s) staged.")
    return {"account_id": account_id, "label": label, "downloaded": total_downloaded, "error": None}

def run():
    parser = argparse.ArgumentParser(description="AIO Wealth Hub Multi-Gmail Statement Fetcher")
    parser.add_argument("--db", type=str, help="Path to SQLite database containing email_accounts table")
    parser.add_argument("--hot-folder", type=str, default=str(DEFAULT_HOT_FOLDER), help="Path to hot folder")
    parser.add_argument("--test", action="store_true", help="Test credentials")
    parser.add_argument("--server", type=str, default="imap.gmail.com", help="IMAP server")
    parser.add_argument("--port", type=int, default=993, help="IMAP port")
    parser.add_argument("--email", type=str, help="Email address for single account run or test")
    parser.add_argument("--password", type=str, help="Password/App password for single account run or test")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")

    args = parser.parse_args()
    hot_folder = Path(args.hot_folder)

    # 1. Test Mode
    if args.test:
        if not args.email or not args.password:
            res = {"success": False, "message": "Email and password are required for connection test."}
        else:
            res = test_imap_connection(args.server, args.port, args.email, args.password)
        if args.json:
            print(json.dumps(res))
        else:
            print(f"Connection test: {'SUCCESS' if res['success'] else 'FAILED'}: {res['message']}")
        sys.exit(0 if res["success"] else 1)

    # 2. Database Multi-Account Mode
    db_path = args.db or os.environ.get("WEALTH_DB_PATH") or "aio_wealth.sqlite"
    accounts_to_process = []

    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, label, email, app_password, server, port FROM email_accounts WHERE enabled = 1")
            for row in cursor.fetchall():
                accounts_to_process.append({
                    "id": row[0],
                    "label": row[1],
                    "email": row[2],
                    "app_password": row[3],
                    "server": row[4],
                    "port": row[5]
                })
            conn.close()
        except Exception as e:
            print(f"[aio-imap-fetcher] Error reading SQLite accounts: {e}", file=sys.stderr)

    # If no accounts in DB, check CLI / environment fallback
    if not accounts_to_process and args.email and args.password:
        accounts_to_process.append({
            "id": "cli-account",
            "label": "Direct CLI Account",
            "email": args.email,
            "app_password": args.password,
            "server": args.server,
            "port": args.port
        })
    elif not accounts_to_process:
        env_user = os.environ.get("IMAP_EMAIL")
        env_pass = os.environ.get("IMAP_PASSWORD")
        if env_user and env_pass:
            accounts_to_process.append({
                "id": "env-account",
                "label": "Environment Account",
                "email": env_user,
                "app_password": env_pass,
                "server": os.environ.get("IMAP_SERVER", "imap.gmail.com"),
                "port": int(os.environ.get("IMAP_PORT", "993"))
            })

    if not accounts_to_process:
        msg = "No enabled email accounts found in database or environment. Configure accounts in AIO Wealth UI."
        if args.json:
            print(json.dumps({"success": False, "message": msg, "results": []}))
        else:
            print(f"[aio-imap-fetcher] {msg}")
        return

    results = []
    total_files = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for acc in accounts_to_process:
        res = fetch_for_account(
            acc["id"],
            acc["label"],
            acc["email"],
            acc["app_password"],
            acc["server"],
            acc["port"],
            hot_folder
        )
        results.append(res)
        total_files += res["downloaded"]

        # Update last_synced_at in DB
        if os.path.exists(db_path) and acc["id"] not in ("cli-account", "env-account"):
            try:
                conn = sqlite3.connect(db_path)
                conn.execute("UPDATE email_accounts SET last_synced_at = ? WHERE id = ?", (now_iso, acc["id"]))
                conn.commit()
                conn.close()
            except Exception:
                pass

    summary = {
        "success": True,
        "accounts_processed": len(accounts_to_process),
        "total_files_staged": total_files,
        "timestamp": now_iso,
        "results": results
    }

    if args.json:
        print(json.dumps(summary))
    else:
        print(f"[aio-imap-fetcher] All accounts finished. Total new statements: {total_files}")

if __name__ == "__main__":
    run()
