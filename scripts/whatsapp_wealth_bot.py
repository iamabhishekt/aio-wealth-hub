#!/usr/bin/env python3
"""
AIO Wealth Hub — WhatsApp Personal Finance Agent Daemon
Listens for commands and OTPs on WhatsApp via `wacli`.
Provides live net worth snapshots, subscription audits, and OTP entry.
"""

import subprocess
import json
import time
import re
import urllib.request
import os

BACKEND_URL = "http://localhost:8088"
MY_JID = "18622151422@s.whatsapp.net"
MY_PHONE = "+18622151422"

def get_backend_summary():
    try:
        req = urllib.request.Request(f"{BACKEND_URL}/api/forecast?monthly_income=5243.42&fx_rate=86.5")
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            return (
                f"📊 *AIO Wealth Hub Snapshot*\n"
                f"• Net Worth: *${data['current_net_worth_usd']:,.2f}* (₹{data['current_net_worth_inr']:,.0f})\n"
                f"• Liquid Assets: *${data['total_assets_usd']:,.2f}*\n"
                f"• Liabilities: *${data['total_liabilities_usd']:,.2f}*\n"
                f"• Monthly Inflow: *+${data['monthly_inflow_usd']:,.2f}*\n"
                f"• Monthly Burn: *-${data['monthly_burn_usd']:,.2f}*\n"
                f"• *Free Surplus*: *+${data['monthly_surplus_usd']:,.2f}/mo* 🚀\n"
                f"\n_Debt is projected to reduce by ${data['monthly_surplus_usd']:,.0f} every month._"
            )
    except Exception as e:
        return f"⚠️ Could not reach local backend: {e}"

def get_accounts_list():
    try:
        req = urllib.request.Request(f"{BACKEND_URL}/api/accounts")
        with urllib.request.urlopen(req, timeout=4) as resp:
            accounts = json.loads(resp.read().decode())
            lines = ["🏦 *Verified Accounts & Debt:*"]
            for a in accounts:
                symbol = "$" if a["currency"] == "USD" else "₹"
                lines.append(f"• *{a['name']}*: {symbol}{a['balance']:,.2f} ({a['institution']})")
            return "\n".join(lines)
    except Exception as e:
        return f"⚠️ Could not query accounts: {e}"

def get_subscriptions_list():
    try:
        req = urllib.request.Request(f"{BACKEND_URL}/api/subscriptions")
        with urllib.request.urlopen(req, timeout=4) as resp:
            subs = json.loads(resp.read().decode())
            if not subs:
                return "📱 *Subscriptions*: None currently flagged in vault."
            lines = ["📱 *Active Subscriptions:*"]
            for s in subs:
                symbol = "$" if s["currency"] == "USD" else "₹"
                lines.append(f"• *{s['service_name']}*: {symbol}{s['cost_per_cycle']:,.2f}/{s['cycle']} ({s['source']})")
            return "\n".join(lines)
    except Exception as e:
        return f"⚠️ Could not query subscriptions: {e}"

def send_whatsapp(to_number, text):
    cmd = ["wacli", "send", "text", "--to", to_number, "--message", text]
    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    except Exception as e:
        print(f"Error sending WhatsApp: {e}")

def main():
    print("==================================================")
    print("  🤖 AIO Wealth Hub WhatsApp Agent Daemon Active  ")
    print(f"  Linked WhatsApp: {MY_PHONE}")
    print("==================================================")

    last_seen_id = None

    while True:
        try:
            # Query last few messages
            res = subprocess.run(["wacli", "messages", "search", "", "--limit", "2", "--json"], capture_output=True, text=True, timeout=10)
            if res.returncode == 0 and res.stdout.strip():
                msgs = json.loads(res.stdout)
                if msgs and len(msgs) > 0:
                    latest = msgs[0]
                    msg_id = latest.get("id") or latest.get("key", {}).get("id")
                    text = (latest.get("text") or latest.get("body") or "").strip().lower()

                    if msg_id and msg_id != last_seen_id:
                        last_seen_id = msg_id
                        print(f"[whatsapp-agent] Received: '{text}' (ID: {msg_id})")

                        # Dispatch command
                        if text in ["status", "summary", "networth", "nw", "balance"]:
                            reply = get_backend_summary()
                            send_whatsapp(MY_PHONE, reply)
                        elif text in ["accounts", "acc", "banks", "cards"]:
                            reply = get_accounts_list()
                            send_whatsapp(MY_PHONE, reply)
                        elif text in ["subs", "subscriptions"]:
                            reply = get_subscriptions_list()
                            send_whatsapp(MY_PHONE, reply)
                        elif text.startswith("otp ") or (text.isdigit() and len(text) in [6, 8]):
                            otp = re.search(r"\b\d{4,8}\b", text).group(0)
                            send_whatsapp(MY_PHONE, f"🔐 Relaying OTP *{otp}* to pending bank portal...")
                            # Run OTP submit
                            subprocess.run(["python3", "scripts/otp_relay_whatsapp.py", MY_PHONE], timeout=15)
                        elif text in ["help", "hi", "hello", "menu"]:
                            help_msg = (
                                "🤖 *AIO Wealth Hub WhatsApp Commands:*\n"
                                "• *status* — View live Net Worth, Assets & Surplus\n"
                                "• *accounts* — List all bank accounts & credit cards\n"
                                "• *subs* — List recurring subscriptions & creep\n"
                                "• *otp <code\>* — Relay a 2FA code to any open bank\n"
                                "\n_100% private, local $0.00 zero-cloud ledger._"
                            )
                            send_whatsapp(MY_PHONE, help_msg)
        except Exception as e:
            pass
        time.sleep(4)

if __name__ == "__main__":
    main()
