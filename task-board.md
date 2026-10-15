# Task Board: AIO Wealth Hub (Personal Finance & Wealth Intelligence)

## Phase 1: Specifications & Connector Inventory [COMPLETED]
1. [x] Define global unified ledger data model (multi-currency USD + INR) → verify: `models.rs` & `types.ts` validate loans, investments, cash, insurance
2. [x] Map authentication and extraction strategy per connector → verify: `documentation/connectors-inventory.md` maps $0-cost extraction pathways
3. [x] Build interactive architecture explainer & forecasting simulator → verify: `documentation/20261014_AIO_WEALTH_HUB_EXPLAINER.html` renders offline
4. [x] Collect required connectors and statement formats → verify: enumerated in README and frontend dropzone

## Phase 2: High-Performance Rust Backend & Zero-Cost Connectors [COMPLETED]
1. [x] Implement local SQLite multi-currency persistence engine → verify: `src/ledger.rs` upserts accounts & subscriptions
2. [x] Implement Apple Card CSV & Amex statement parsers → verify: `cargo test` passes `tests::test_csv_parsers`
3. [x] Implement free Splitwise client & Indian Mutual Fund e-CAS / LIC models → verify: `cargo test` passes `tests::test_ledger_and_forecaster_flow`
4. [x] Implement Axum HTTP REST server (`/api/accounts`, `/api/forecast`, `/api/parse/*`) → verify: `cargo check` clean with 0 warnings

## Phase 3: Cross-Platform Common Frontend (Android, iOS, Web) [COMPLETED]
1. [x] Scaffold Vite + React + TypeScript + Tailwind CSS UI → verify: `npm run build` compiles clean in 758ms
2. [x] Build Native Bridge (`nativeBridge.ts`) with Biometrics, Secure Enclave, and Local Push Notifications → verify: Face ID / Touch ID / Fingerprint & zero-server push support
3. [x] Build Consolidated Net Worth Hero (USD/INR toggle, FX rate, Assets/Liabilities/Runway) → verify: interactive responsive display
4. [x] Build Accounts, Cards & Debt Payoff Grid → verify: filter by US/India, custom APR & minimum dues
5. [x] Build Subscription Creep Radar (Google Play, Apple Subscriptions) → verify: annual drag computed & 1-tap cancellation flagging
6. [x] Build 12-Month Spending & Net Worth Forecaster → verify: interactive slider adjusts Monte Carlo trajectory
7. [x] Configure Tauri v2 (`src-tauri/tauri.conf.json`, `Cargo.toml`, `main.rs`) for native iOS (.ipa) & Android (.apk) packaging

## Phase 4: Field Verification & REA Device Testing [ACTIVE]
1. [ ] Live device test with ARTEMIS / Android emulator → verify: biometric unlock & local notifications firing
2. [ ] Ingest live user statements & Splitwise token → verify: consolidated net worth matches real accounts
