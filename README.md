# AIO Wealth Hub (Personal Finance & Wealth Intelligence)

## Purpose
A single dashboard to monitor, forecast, and optimize personal wealth across the United States and India.

## Core Capabilities
1. **Multi-Currency Net Worth**: Track cash, investments, debt, and life insurance policies in USD and INR.
2. **Splitwise Sync**: Reconcile group balances and personal debts into active cashflow.
3. **Automated Banking**: Connect US bank accounts (checking, savings, loans) and Indian bank accounts.
4. **Card Management**: Ingest transactions from Apple Card and American Express.
5. **Subscription Auditing**: Extract active Google Play and recurring web subscriptions.
6. **Future Forecasting**: Predict 12-month cash runway, interest costs, and habit changes.

## Security and Privacy Invariants
1. **Local-First Storage**: Store all financial data in an encrypted local database (SQLite/SQLCipher).
2. **No Cloud Relay**: Process raw statements and tokens strictly on your machine.
3. **Zero Hardcoded Secrets**: Store API tokens and private keys in local `.env` files. Never commit secrets to git.

## Architecture Pipeline
- **Ingestion**: Public APIs, OFX exports, and REA reverse-engineered payloads.
- **Normalization**: Convert all asset and liability classes into standard Double-Entry Ledger entries.
- **FX Bridge**: Convert USD and INR at real-time market rates.
- **Intelligence**: Run recurring cost detection, debt payoff optimization, and Monte Carlo projections.
- **Interface**: Local web UI with instant search, cashflow timelines, and alert triggers.
