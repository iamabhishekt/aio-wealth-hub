# Open-Source Parsers Ecosystem for AIO Wealth Hub

This inventory catalogs proven open-source repositories and libraries that can be directly wired into **AIO Wealth Hub** to provide $0-cost, local statement and account parsing without relying on paid data aggregators (like Plaid, SimpleFIN, or Yodlee).

---

## 1. Indian Mutual Funds: CAMS & KFintech CAS Parsers

| Repository / Package | Ecosystem | Capabilities | Integration Strategy |
| :--- | :--- | :--- | :--- |
| **[`codereverser/casparser`](https://github.com/codereverser/casparser)** | Python / CLI | Gold standard for parsing password-protected Consolidated Account Statements (CAS) from CAMS and KFintech (Karvy). Extracts folios, schemes, ISIN, NAV, units, transactions, and calculates capital gains (STCG/LTCG). | Can be invoked as a local CLI sub-process or compiled via PyO3 into our Rust backend, or converted to Rust/WASM. |
| **[`casparser-isin`](https://pypi.org/project/casparser-isin/)** | Python / Data | ISIN mapping database for all Indian mutual funds schemes. | Embed lookup tables locally for automatic scheme categorization. |
| **`sakthipriyan/xfina`** | Python | Parses ReBIT & Sahamati Indian Account Aggregator (AA) standardized XML/JSON payloads. | Direct JSON deserialization into our unified `Account` and `Transaction` models. |

---

## 2. Apple Card, Amex & US Bank Statements: OFX, QFX & CSV

| Repository / Crate | Ecosystem | Capabilities | Integration Strategy |
| :--- | :--- | :--- | :--- |
| **[`ofxy`](https://github.com/n8henrie/ofxy)** | Rust Crate (`crates.io/crates/ofxy`) | High-performance Rust parser for OFX 1.6 credit card and bank downloads (used by Apple Card `.ofx` exports, Amex, Chase). Handles unclosed SGML tags gracefully with `sgmlish`. | Add directly to `backend/Cargo.toml`. Gives instant zero-cost Apple Card & bank import. |
| **[`bank-statement-rs`](https://crates.io/crates/bank-statement-rs)** | Rust Crate | Multi-format builder for bank and credit card downloads (auto-detects QFX/OFX/CSV). | Wire directly into `backend/src/connectors.rs`. |
| **`csv` + `serde`** | Rust Crates | Native zero-allocation streaming CSV parser for Apple Card monthly transaction CSVs. | Already wired in `aio_wealth_core::connectors::StatementParser`. |

---

## 3. Splitwise Free Connectors

| Endpoint / SDK | Capabilities | Integration Strategy |
| :--- | :--- | :--- |
| **Splitwise Official Free API (`v3.0`)** | `GET /api/v3.0/get_current_user` extracts net personal balance. `GET /api/v3.0/get_expenses` retrieves friend IOUs. | Already implemented in `aio_wealth_core::connectors::SplitwiseConnector`. Free developer tokens require zero subscription. |

---

## 4. Subscriptions & Creep Detection

| Source | Capabilities | Integration Strategy |
| :--- | :--- | :--- |
| **Google Play Orders** | Google Play Order History / Google Takeout CSV exports. | Local regex parser for recurring cycles ($9.99/mo, $139/yr). |
| **In-App StoreKit / Play Billing** | Native Tauri StoreKit / Billing plugins or receipt parsing. | Directly alerts on upcoming renewals using local push notifications. |
