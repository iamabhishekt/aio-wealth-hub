# Connector Inventory & Data Acquisition Guide

This document lists each financial connector, what data is needed from you, and how REA (Reverse Engineering Assistant) extracts data from closed platforms.

---

## 1. Splitwise Connector
- **Category**: Shared expenses and debts
- **Integration Path**: Splitwise REST API (OAuth2 / Personal Access Token)
- **What We Need From You**:
  - Splitwise API Key: Obtain from [Splitwise Developer Portal](https://secure.splitwise.com/apps/new) (Create an API key, copy the API Key).
- **Data Extracted**:
  - Current net balance (owed vs owing)
  - Active group expenses
  - Pending settlements

---

## 2. US Banking & Loan Accounts (Financial Connect)
- **Category**: Checking, Savings, Auto Loans, Student Loans, Mortgages
- **Integration Path**: Plaid Link or SimpleFIN Bridge (Local OFX/QFX fallback)
- **What We Need From You**:
  - Option A (Direct Plaid): Plaid `client_id` and `secret` (Free sandbox / limited dev keys), OR:
  - Option B (SimpleFIN): Read-only bridge token ($1.50/mo), OR:
  - Option C (Local Statement Import): Download monthly OFX/QFX/CSV files into `projects/aio-wealth-hub/data/imports/us-banks/`.
- **Data Extracted**:
  - Live account balances
  - Categorized transactions
  - Loan principal, interest rate (APR), monthly minimum payment, and amortization schedule

---

## 3. American Express (Amex) Credit Card
- **Category**: Credit Card
- **Integration Path**: Direct OFX Connect / Statement Parser / Plaid
- **What We Need From You**:
  - Download monthly `.ofx` / `.qfx` or `.csv` statements from the Amex web portal, OR link via Plaid.
- **Data Extracted**:
  - Statement balance, minimum due, payment due date
  - Transaction history, reward points balance, statement credits

---

## 4. Apple Card (Apple Credit Card)
- **Category**: Credit Card (Closed Apple Ecosystem)
- **Integration Path**:
  - Method 1 (Automated iOS Shortcut): iOS Shortcut sends exported OFX/CSV to local web hook or synced folder via iCloud Drive.
  - Method 2 (REA Inspection): Use REA to parse Apple Wallet database snapshots (`observe-sqlite-database` on local macOS/iOS backup) or intercept network payloads via macOS Apple Card portal.
- **What We Need From You**:
  - Either: Export Apple Card monthly statement as CSV/OFX from Apple Wallet to `~/brain/projects/aio-wealth-hub/data/imports/apple-card/`,
  - Or: Set up a 1-tap iOS Shortcut that automatically pushes transactions.
- **Data Extracted**:
  - Total balance, remaining statement balance, Daily Cash earned, transaction list

---

## 5. Google Play Subscription Checker
- **Category**: Recurring Subscriptions & Digital Services
- **Integration Path**:
  - Method 1: Google Takeout "Google Play Store" export JSON.
  - Method 2 (REA Session Extraction): Use REA web inspection (`inspect-web-network-capture` or CDP session) against `play.google.com/store/account/subscriptions` to extract active subscriptions and renew dates.
- **What We Need From You**:
  - Log in to Google Play in a local Chrome session for REA to extract the subscription payload, OR download your Google Play Subscriptions page HTML/JSON.
- **Data Extracted**:
  - Service name (e.g. YouTube Premium, Google One, apps)
  - Price per billing cycle and next renewal date
  - Cancellation or trial expiration notices

---

## 6. Indian Bank Account & Investment Connect
- **Category**: Savings, Deposits, Demat, Mutual Funds (INR)
- **Integration Path**:
  - RBI Account Aggregator (AA) framework (Setu / OneMoney / Anumati), OR CAMS/KFintech Consolidated Account Statement (CAS).
- **What We Need From You**:
  - CAMS/KFintech e-CAS PDF: Download from [CAMS Online](https://www.camsonline.com/) (monthly statement with password),
  - Or: NetBanking password-protected PDF/CSV statements dropped into `projects/aio-wealth-hub/data/imports/india-banks/`.
- **Data Extracted**:
  - Bank balances (HDFC, SBI, ICICI, etc.)
  - Mutual fund folios, units, NAV, unrealized profit/loss, and portfolio allocation
  - Equity holdings (via CAS)

---

## 7. Indian Life Insurance (LIC & Term Policies)
- **Category**: Protection, Savings, and Family Security
- **Integration Path**: LIC Customer Portal export / Policy schedule parser
- **What We Need From You**:
  - Policy numbers, sum assured, policy start date, term, premium amount, premium payment frequency (annual/semi-annual), and policy schedule PDF.
- **Data Extracted**:
  - Annual premium payment calendar & due date alerts
  - Guaranteed sum assured & vested bonus accumulation
  - Maturity date and anticipated maturity payout

---

## 8. Future Predictions & Wealth Intelligence Engine
- **Engine Capabilities**:
  - **Dynamic Runway Calculator**: Computes months of runway under variable income/expense scenarios.
  - **Debt Avalanche / Snowball Optimizer**: Identifies fastest path to eliminate credit card and loan interest.
  - **Subscription Creep Auditor**: Surfaces unused or redundant subscriptions.
  - **Currency Fluctuation Hedge**: Models USD/INR remittance timing based on exchange rates.
