#!/usr/bin/env python3
"""
AIO Wealth Hub - Zero-Cost Automated IMAP Statement & Bill Fetcher.
Zero external dependencies (uses standard library imaplib & email).
Connects securely via IMAP SSL, searches for statement/bill emails from
configured banks, utilities, and funds, and saves attachments to the
AIO Wealth hot folder for instant local ingestion.
"""

import os
import sys
import email
from email.header import decode_header
import imaplib
from pathlib import Path

# Hot folder destination (default: ~/Documents/AIO-Wealth-Statements)
HOT_FOLDER = Path(os.environ.get("WEALTH_HOT_FOLDER", Path.home() / "Documents" / "AIO-Wealth-Statements"))
HOT_FOLDER.mkdir(parents=True, exist_ok=True)

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

def fetch_statements():
    imap_server = os.environ.get("IMAP_SERVER", "imap.gmail.com")
    imap_user = os.environ.get("IMAP_EMAIL")
    imap_pass = os.environ.get("IMAP_PASSWORD")

    if not imap_user or not imap_pass:
        print("[aio-imap-fetcher] Notice: IMAP_EMAIL or IMAP_PASSWORD not configured.")
        print("[aio-imap-fetcher] To enable automated 2x/day email statement fetch:")
        print("  export IMAP_EMAIL='your_email@gmail.com'")
        print("  export IMAP_PASSWORD='your_16_char_app_password'")
        return 0

    print(f"[aio-imap-fetcher] Connecting to {imap_server} ({imap_user})...")
    try:
        mail = imaplib.IMAP4_SSL(imap_server)
        mail.login(imap_user, imap_pass)
        mail.select("INBOX")
    except Exception as e:
        print(f"[aio-imap-fetcher] Authentication error: {e}", file=sys.stderr)
        return 0

    total_downloaded = 0

    for domain, keywords, tag in PROVIDER_RULES:
        search_query = f'(FROM "{domain}")'
        status, data = mail.search(None, search_query)
        if status != "OK" or not data[0]:
            continue

        email_ids = data[0].split()
        # Scan most recent 10 emails from this sender
        for eid in email_ids[-10:]:
            res, msg_data = mail.fetch(eid, "(RFC822)")
            if res != "OK":
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            subject = clean_subject(msg["Subject"]).lower()

            # Match against relevant keywords
            if not any(k in subject for k in keywords):
                continue

            # Extract attachments
            for part in msg.walk():
                if part.get_content_maintype() == "multipart":
                    continue
                content_disp = part.get("Content-Disposition", "")
                filename = part.get_filename()

                if filename:
                    decoded_fname = clean_subject(filename)
                    ext = Path(decoded_fname).suffix.lower()

                    if ext in [".pdf", ".csv", ".ofx", ".qfx"]:
                        safe_name = f"{tag}_{decoded_fname}"
                        target_file = HOT_FOLDER / safe_name
                        if not target_file.exists():
                            payload = part.get_payload(decode=True)
                            if payload:
                                target_file.write_bytes(payload)
                                total_downloaded += 1
                                print(f"[aio-imap-fetcher] Saved: {safe_name} -> {HOT_FOLDER}")

    mail.logout()
    print(f"[aio-imap-fetcher] Sync complete. {total_downloaded} new statement(s) staged.")
    return total_downloaded

if __name__ == "__main__":
    fetch_statements()
