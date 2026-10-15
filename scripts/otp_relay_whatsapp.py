#!/usr/bin/env python3
"""
AIO Wealth Hub — WhatsApp OTP Relay Daemon
Watches active Chrome CDP tabs for 2FA / OTP prompts.
When detected, messages user on WhatsApp via `wacli`, listens for the reply,
and inputs the OTP into the bank portal automatically.
"""

import subprocess
import json
import time
import re
import urllib.request
import sys

CDP_HTTP_ENDPOINT = "http://127.0.0.1:9222"

def get_cdp_targets():
    try:
        req = urllib.request.Request(f"{CDP_HTTP_ENDPOINT}/json")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return []

def send_whatsapp_message(to_number, message_text):
    """Sends a WhatsApp text message via wacli."""
    cmd = [
        "wacli", "send", "text",
        "--to", to_number,
        "--message", message_text
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        return res.returncode == 0
    except Exception as e:
        print(f"[otp-relay] Error sending WhatsApp message: {e}")
        return False

def check_for_otp_in_page(target):
    """Inspects a page target DOM for OTP / 2FA verification input fields."""
    ws_url = target.get("webSocketDebuggerUrl")
    if not ws_url:
        return None

    # Fast heuristic check via evaluate
    eval_script = """
    (() => {
        const bodyText = (document.body ? document.body.innerText : "").toLowerCase();
        const has2faText = bodyText.includes("security code") ||
                           bodyText.includes("verification code") ||
                           bodyText.includes("enter the 6-digit") ||
                           bodyText.includes("two-step verification") ||
                           bodyText.includes("one-time passcode") ||
                           bodyText.includes("enter code");

        const otpInput = document.querySelector(
            'input[autocomplete="one-time-code"], ' +
            'input[name*="otp" i], input[id*="otp" i], ' +
            'input[name*="code" i], input[id*="code" i], ' +
            'input[name*="passcode" i], input[id*="passcode" i], ' +
            'input[name*="verification" i], input[id*="verification" i], ' +
            'input[type="tel"][maxlength="6"], input[type="text"][maxlength="6"]'
        );

        if (has2faText && otpInput) {
            return {
                detected: true,
                title: document.title,
                url: window.location.href,
                placeholder: otpInput.placeholder || "",
                name: otpInput.name || otpInput.id || "otp_field"
            };
        }
        return { detected: false };
    })()
    """

    # Run check via CDP evaluation (through quick node helper or curl)
    node_cmd = [
        "node", "-e",
        f"""
        const ws = new WebSocket('{ws_url}');
        ws.onopen = () => {{
            ws.send(JSON.stringify({{ id: 1, method: "Runtime.evaluate", params: {{ expression: `{eval_script}`, returnByValue: true }} }}));
        }};
        ws.onmessage = (evt) => {{
            const msg = JSON.parse(evt.data);
            if (msg.id === 1) {{
                console.log(JSON.stringify(msg.result?.result?.value || {{}}));
                process.exit(0);
            }}
        }};
        setTimeout(() => process.exit(0), 3000);
        """
    ]
    try:
        p = subprocess.run(node_cmd, capture_output=True, text=True, timeout=5)
        out = p.stdout.strip()
        if out:
            data = json.loads(out)
            if data.get("detected"):
                return data
    except Exception:
        pass
    return None

def submit_otp_to_page(target, otp_code):
    """Types the OTP code into the detected field and clicks Submit."""
    ws_url = target.get("webSocketDebuggerUrl")
    if not ws_url:
        return False

    script = f"""
    (() => {{
        const otpInput = document.querySelector(
            'input[autocomplete="one-time-code"], ' +
            'input[name*="otp" i], input[id*="otp" i], ' +
            'input[name*="code" i], input[id*="code" i], ' +
            'input[name*="passcode" i], input[id*="passcode" i], ' +
            'input[name*="verification" i], input[id*="verification" i], ' +
            'input[type="tel"][maxlength="6"], input[type="text"][maxlength="6"]'
        );
        if (!otpInput) return false;

        otpInput.focus();
        otpInput.value = '{otp_code}';
        otpInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
        otpInput.dispatchEvent(new Event('change', {{ bubbles: true }}));

        // Find submit button
        const btn = document.querySelector(
            'button[type="submit"], input[type="submit"], ' +
            'button[id*="submit" i], button[id*="verify" i], ' +
            'button[id*="continue" i], [role="button"]'
        );
        if (btn) {{
            btn.click();
            return true;
        }}
        return true;
    }})()
    """

    node_cmd = [
        "node", "-e",
        f"""
        const ws = new WebSocket('{ws_url}');
        ws.onopen = () => {{
            ws.send(JSON.stringify({{ id: 1, method: "Runtime.evaluate", params: {{ expression: `{script}`, returnByValue: true }} }}));
        }};
        ws.onmessage = (evt) => {{
            const msg = JSON.parse(evt.data);
            if (msg.id === 1) {{
                console.log(JSON.stringify(msg.result?.result?.value || false));
                process.exit(0);
            }}
        }};
        setTimeout(() => process.exit(0), 4000);
        """
    ]
    try:
        p = subprocess.run(node_cmd, capture_output=True, text=True, timeout=6)
        return p.stdout.strip() == "true"
    except Exception:
        return False

def listen_for_otp_reply(timeout_sec=180):
    """Polls wacli for the latest incoming WhatsApp message containing a numeric OTP."""
    start = time.time()
    print(f"[otp-relay] Waiting up to {timeout_sec}s for WhatsApp OTP reply...")

    while time.time() - start < timeout_sec:
        try:
            # Search messages from the last few minutes
            res = subprocess.run(["wacli", "messages", "search", "", "--limit", "3", "--json"], capture_output=True, text=True, timeout=10)
            if res.returncode == 0 and res.stdout.strip():
                msgs = json.loads(res.stdout)
                for m in msgs:
                    body = m.get("text") or m.get("body") or ""
                    match = re.search(r"\b(\d{4,8})\b", body)
                    if match:
                        otp = match.group(1)
                        print(f"[otp-relay] Captured OTP from WhatsApp: {otp}")
                        return otp
        except Exception:
            pass
        time.sleep(4)
    return None

def main():
    if len(sys.argv) < 2:
        print("Usage: ./otp_relay_whatsapp.py <YOUR_PHONE_NUMBER_WITH_COUNTRY_CODE>")
        print("Example: ./otp_relay_whatsapp.py +18622151422")
        sys.exit(1)

    phone_number = sys.argv[1]
    print(f"==================================================")
    print(f"  🔐 AIO Wealth Hub WhatsApp OTP Relay Active    ")
    print(f"  Target Phone: {phone_number}")
    print(f"  CDP Host: {CDP_HTTP_ENDPOINT}")
    print(f"==================================================")

    while True:
        targets = get_cdp_targets()
        pages = [t for t in targets if t.get("type") == "page" and not t.get("url", "").startswith("chrome://")]

        for p in pages:
            otp_info = check_for_otp_in_page(p)
            if otp_info:
                bank_title = p.get("title") or "Financial Institution"
                print(f"\n[ALERT] OTP Input Detected on: {bank_title}")
                print(f"URL: {p.get('url')}")

                msg = (
                    f"⚠️ AIO Wealth Hub Alert:\n"
                    f"2FA Code required for: {bank_title}\n"
                    f"Please reply to this message directly with your OTP code."
                )

                print(f"[otp-relay] Dispatching WhatsApp alert to {phone_number}...")
                send_whatsapp_message(phone_number, msg)

                # Wait for user's reply via WhatsApp
                otp_code = listen_for_otp_reply(timeout_sec=180)
                if otp_code:
                    print(f"[otp-relay] Submitting OTP {otp_code} to page...")
                    ok = submit_otp_to_page(p, otp_code)
                    if ok:
                        send_whatsapp_message(
                            phone_number,
                            f"✅ {bank_title}: OTP submitted successfully! Refreshing ledger..."
                        )
                        print("[otp-relay] Successfully submitted OTP!")
                    else:
                        send_whatsapp_message(
                            phone_number,
                            f"❌ Could not click submit button on {bank_title}. Please check browser."
                        )
                else:
                    print("[otp-relay] Timed out waiting for OTP reply.")

        time.sleep(10)

if __name__ == "__main__":
    main()
