# Automated Daily Statement & Data Sync Guide ($0.00 Cost)

This guide details how to configure **AIO Wealth Hub** once so it automatically fetches, parses, and synchronizes your accounts, loans, credit cards, bills, and mutual funds **twice daily (at 08:00 AM and 08:00 PM)** with zero cloud subscriptions and zero Plaid fees.

---

## Architecture Overview

```
                         ┌────────────────────────────────────────────────────────┐
                         │               Your Machine (Local Only)                │
                         │                                                        │
┌──────────────────┐     │  ┌───────────────────────┐   ┌──────────────────────┐  │
│ Banks & Bills    │─────┼─>│ IMAP Statement Fetcher│──>│ Hot Folder:          │  │
│ (Chase, PNC,     │Email│  │ (Python zero-dep CLI) │   │ ~/Documents/         │  │
│  Amex, HDFC,     │     │  └───────────────────────┘   │  AIO-Wealth-         │  │
│  Progressive,    │     │                                  Statements/         │  │
│  PSEG, Verizon,  │     │                                      │               │  │
│  Jio, Airtel)    │     │                                      ▼               │  │
└──────────────────┘     │                              ┌──────────────────────┐  │
                         │                              │ Rust Sync Daemon     │  │
┌──────────────────┐     │  ┌───────────────────────┐   │ (ofxy / csv /        │  │
│ iPhone Wallet /  │─────┼─>│ iOS Shortcuts         │──>│  casparser)          │  │
│ Apple Card       │Tap  │  │ (iCloud Hot Drop)     │   └──────────────────────┘  │
└──────────────────┘     │  └───────────────────────┘           │               │  │
                         │                                      ▼               │  │
┌──────────────────┐     │  ┌───────────────────────┐   ┌──────────────────────┐  │
│ Splitwise Free   │─────┼─>│ Polling Connector     │──>│ Local Encrypted      │  │
│ Developer API    │HTTPS│  │ (Scheduled 12h loop)  │   │ SQLite Ledger        │  │
└──────────────────┘     │  └───────────────────────┘   └──────────────────────┘  │
                         └────────────────────────────────────────────────────────┘
```

---

## Step 1: Activate macOS Background Daemon (Twice Daily)

We provide an automated setup script that creates a native macOS `launchd` background agent scheduled for **08:00 AM** and **08:00 PM**:

```bash
cd ~/aio-wealth-hub
./scripts/setup_daily_cron.sh
```

This installs `~/Library/LaunchAgents/com.iamabhishekt.aiowealth.sync.plist`. It runs silently in the background without opening terminal windows or consuming battery.

To verify daemon status:
```bash
launchctl list | grep com.iamabhishekt.aiowealth.sync
```

---

## Step 2: Configure 1-Time Email Statement Fetcher (IMAP)

Every bank, lender, and utility provider sends PDF e-statements, e-bills, or transaction receipts to your email. The zero-dependency Python script (`scripts/fetch_statements_imap.py`) connects securely via IMAP SSL to download these attachments directly into your local hot folder.

### Setting your credentials:
Add your email credentials to your `~/.zshrc` or `.env`:
```bash
# Example for Gmail (Use a 16-character App Password, NOT your main password)
export IMAP_SERVER="imap.gmail.com"
export IMAP_EMAIL="your_email@gmail.com"
export IMAP_PASSWORD="abcd efgh ijkl mnop"
```
*(To create a Gmail App Password: Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App Passwords &rarr; Generate "AIO Wealth Hub").*

### Monitored Sender Rules:
| Provider | Matched Domain | Search Keywords | Handled Formats |
| :--- | :--- | :--- | :--- |
| **Chase Bank** | `chase.com` | `statement`, `e-statement` | PDF / CSV / OFX |
| **PNC Bank** | `pnc.com` | `statement`, `account summary` | PDF / CSV |
| **American Express**| `americanexpress.com`| `statement`, `bill ready` | PDF / CSV / QFX |
| **Toyota Financial**| `toyotafinancial.com`| `bill`, `statement`, `payment due`| PDF statements |
| **HDFC Home Loan** | `hdfcbank.com` / `net`| `home loan`, `loan account` | PDF / e-Statement |
| **Progressive** | `progressive.com` | `bill`, `premium notice` | PDF bill declaration |
| **PSEG** | `pseg.com` | `energy bill`, `bill is ready`| PDF monthly bill |
| **Verizon Fios** | `verizon.com` | `fios`, `bill is ready` | PDF monthly bill |
| **T-Mobile US** | `t-mobile.com` | `statement`, `bill is ready` | PDF monthly bill |
| **Reliance Jio** | `jio.com` | `fiber bill`, `invoice` | PDF tax invoice |
| **Bharti Airtel** | `airtel.com` | `bill`, `invoice`, `airtel` | PDF e-bill |
| **CAMS Mutual Funds**| `camsonline.com` | `consolidated account statement`| Encrypted e-CAS PDF |
| **Netflix India** | `netflix.com` | `invoice`, `receipt` | Monthly receipt email |

---

## Step 3: Apple Card Real-Time Tap Sync (iOS Shortcut)

Because Apple Card does not have a public API, you can achieve **100% real-time automatic tracking** using native iOS Shortcuts:

1. Open **Shortcuts** app on your iPhone &rarr; Tap **Automation** tab.
2. Tap **+** &rarr; Select **Transaction (Wallet)**.
3. Select your **Apple Card**. Toggle **Run Immediately** (no prompt) and toggle *Notify When Run* off.
4. Add Action: **Text**:
   ```
   [Current Date],[Merchant],[Amount]
   ```
5. Add Action: **Append to File**:
   * Text: output of step 4.
   * Path: `iCloud Drive/AIO-Wealth/apple_card.csv` (Make New Line: ON).
6. **Result**: Every time you tap Apple Pay or use Apple Card, it appends to the iCloud CSV. Our hot folder watcher ingests it automatically!

---

## Step 4: CAMS & KFintech Automated Indian Mutual Fund Sync

1. Go to [CAMS Mailback Services](https://mailback.camsonline.com/eCAS/eCAS_request.aspx).
2. Enter your registered Email ID and PAN.
3. Choose **Consolidated Account Statement (CAS) - Detailed** and set delivery schedule to **Monthly / Periodic**.
4. When CAMS emails the encrypted PDF to your inbox, the IMAP fetcher drops it into `~/Documents/AIO-Wealth-Statements/`, where `casparser` automatically unpacks all Nippon India & mutual fund units and NAV valuations!

---

## Step 5: Splitwise Automated Polling

1. Obtain your free personal API key from [Splitwise Apps](https://secure.splitwise.com/apps/new).
2. Paste it once into the Splitwise tab in AIO Wealth Hub.
3. It is stored securely in your hardware keychain. The background Rust daemon queries `GET /api/v3.0/get_current_user` every 12 hours and records your net balance into the SQLite ledger.
