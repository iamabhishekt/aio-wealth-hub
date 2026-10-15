use aio_wealth_core::*;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct AppState {
    db: LedgerDb,
    daemon: SyncDaemon,
}

#[derive(Deserialize)]
struct ForecastQuery {
    monthly_income: Option<f64>,
    fx_rate: Option<f64>,
}

#[derive(Deserialize)]
struct ParseCsvRequest {
    account_id: String,
    csv_data: String,
}

#[derive(Deserialize)]
struct SplitwiseSyncRequest {
    api_key: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Open or create persistent SQLite database in local data directory
    let db_path = std::env::var("WEALTH_DB_PATH").unwrap_or_else(|_| "aio_wealth.sqlite".to_string());
    let db = LedgerDb::open_file(&db_path)?;
    println!("[aio-wealth-hub] Initialized SQLite store at: {}", db_path);

    // Initialize automated sync daemon (default hot folder: ~/Documents/AIO-Wealth-Statements)
    let hot_folder = std::env::var("WEALTH_HOT_FOLDER")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| SyncDaemon::default_hot_folder());
    let splitwise_key = std::env::var("SPLITWISE_API_KEY").ok();

    let daemon = SyncDaemon::new(
        hot_folder.clone(),
        splitwise_key,
        std::path::PathBuf::from(&db_path),
    );

    // Spawn automated background scheduler (runs twice per day, every 12h)
    daemon.clone().spawn_background_scheduler(db.clone());

    let state = AppState { db, daemon };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(health_handler))
        .route("/api/accounts", get(list_accounts).post(upsert_account))
        .route("/api/subscriptions", get(list_subscriptions).post(upsert_subscription))
        .route("/api/forecast", get(get_forecast))
        .route("/api/parse/apple-card", post(parse_apple_card))
        .route("/api/parse/amex", post(parse_amex))
        .route("/api/connectors/splitwise/sync", post(sync_splitwise))
        .route("/api/connectors/splitwise/details", get(get_splitwise_details))
        .route("/api/sync/status", get(sync_status_handler))
        .route("/api/sync/trigger", post(sync_trigger_handler))
        .route("/api/transactions", get(list_transactions))
        .route("/api/email-accounts", get(list_email_accounts).post(upsert_email_account))
        .route("/api/email-accounts/:id", delete(delete_email_account))
        .route("/api/email-accounts/test", post(test_email_account))
        .route("/api/openaccountant/report", get(openaccountant_report_handler))
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8088);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("[aio-wealth-hub] API Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "aio-wealth-hub-core",
        "version": "0.1.0",
        "cost": "$0.00 (100% free / local)",
        "automation": "Twice daily background daemon (08:00 & 20:00)"
    }))
}

async fn list_accounts(State(state): State<AppState>) -> Result<Json<Vec<Account>>, StatusCode> {
    state
        .db
        .get_all_accounts()
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn upsert_account(
    State(state): State<AppState>,
    Json(payload): Json<Account>,
) -> Result<StatusCode, StatusCode> {
    state
        .db
        .upsert_account(&payload)
        .map(|_| StatusCode::OK)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn list_subscriptions(
    State(state): State<AppState>,
) -> Result<Json<Vec<Subscription>>, StatusCode> {
    state
        .db
        .get_subscriptions()
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn upsert_subscription(
    State(state): State<AppState>,
    Json(payload): Json<Subscription>,
) -> Result<StatusCode, StatusCode> {
    state
        .db
        .upsert_subscription(&payload)
        .map(|_| StatusCode::OK)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_forecast(
    State(state): State<AppState>,
    Query(params): Query<ForecastQuery>,
) -> Result<Json<ForecastResult>, StatusCode> {
    let accounts = state
        .db
        .get_all_accounts()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let subs = state
        .db
        .get_subscriptions()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let income = params.monthly_income.unwrap_or(7500.0);
    let fx = params.fx_rate.unwrap_or(86.5);

    let forecast = WealthForecaster::compute_snapshot(&accounts, &subs, income, fx);
    Ok(Json(forecast))
}

async fn parse_apple_card(
    Json(req): Json<ParseCsvRequest>,
) -> Json<Vec<Transaction>> {
    let txs = StatementParser::parse_apple_card_csv(&req.csv_data, &req.account_id);
    Json(txs)
}

async fn parse_amex(
    Json(req): Json<ParseCsvRequest>,
) -> Json<Vec<Transaction>> {
    let txs = StatementParser::parse_amex_csv(&req.csv_data, &req.account_id);
    Json(txs)
}

#[derive(Serialize)]
struct SplitwiseSyncResponse {
    net_balance_usd: f64,
    total_owed_to_you: f64,
    total_you_owe: f64,
    friends: Vec<SplitwiseFriendBalance>,
    recent_expenses: Vec<SplitwiseExpenseItem>,
    status: String,
}

async fn get_splitwise_details(
    State(state): State<AppState>,
) -> Result<Json<SplitwiseSyncResponse>, StatusCode> {
    let key = std::env::var("SPLITWISE_API_KEY")
        .unwrap_or_else(|_| "YVzYyTkZdzuH5QpAaik8HQxQhqM1DhpqcCRqlbaQ".to_string());
    let connector = SplitwiseConnector::new(key);
    match connector.fetch_full_details().await {
        Ok(details) => {
            let account = Account {
                id: "splitwise-net".to_string(),
                name: "Splitwise Net Balance".to_string(),
                account_type: AccountType::SplitwiseNetBalance,
                currency: Currency::USD,
                balance: details.net_balance_usd,
                apr: None,
                monthly_min_payment: None,
                institution: "Splitwise".to_string(),
                updated_at: chrono::Utc::now(),
            };
            let _ = state.db.upsert_account(&account);
            Ok(Json(SplitwiseSyncResponse {
                net_balance_usd: details.net_balance_usd,
                total_owed_to_you: details.total_owed_to_you,
                total_you_owe: details.total_you_owe,
                friends: details.friends,
                recent_expenses: details.recent_expenses,
                status: "synced".to_string(),
            }))
        }
        Err(e) => {
            eprintln!("Splitwise get details failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn sync_splitwise(
    State(state): State<AppState>,
    Json(req): Json<SplitwiseSyncRequest>,
) -> Result<Json<SplitwiseSyncResponse>, StatusCode> {
    let connector = SplitwiseConnector::new(req.api_key);
    match connector.fetch_full_details().await {
        Ok(details) => {
            let account = Account {
                id: "splitwise-net".to_string(),
                name: "Splitwise Net Balance".to_string(),
                account_type: AccountType::SplitwiseNetBalance,
                currency: Currency::USD,
                balance: details.net_balance_usd,
                apr: None,
                monthly_min_payment: None,
                institution: "Splitwise".to_string(),
                updated_at: chrono::Utc::now(),
            };
            let _ = state.db.upsert_account(&account);
            Ok(Json(SplitwiseSyncResponse {
                net_balance_usd: details.net_balance_usd,
                total_owed_to_you: details.total_owed_to_you,
                total_you_owe: details.total_you_owe,
                friends: details.friends,
                recent_expenses: details.recent_expenses,
                status: "synced".to_string(),
            }))
        }
        Err(e) => {
            eprintln!("Splitwise sync failed: {}", e);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}

async fn sync_status_handler(State(state): State<AppState>) -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "active",
        "schedule": "Twice daily (every 12 hours)",
        "hot_folder": state.daemon.hot_folder.display().to_string(),
        "iCloud_supported": true,
        "supported_formats": ["CSV", "OFX", "QFX", "PDF (e-CAS)"]
    }))
}

async fn sync_trigger_handler(State(state): State<AppState>) -> Result<Json<SyncReport>, StatusCode> {
    state
        .daemon
        .run_sync_cycle(&state.db)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn list_transactions(
    State(state): State<AppState>,
) -> Result<Json<Vec<Transaction>>, StatusCode> {
    state
        .db
        .get_transactions()
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn list_email_accounts(
    State(state): State<AppState>,
) -> Result<Json<Vec<EmailAccountConfig>>, StatusCode> {
    let mut accounts = state
        .db
        .get_email_accounts()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Mask passwords before returning to client UI
    for acc in accounts.iter_mut() {
        if !acc.app_password.is_empty() {
            acc.app_password = "••••••••••••••••".to_string();
        }
    }
    Ok(Json(accounts))
}

async fn upsert_email_account(
    State(state): State<AppState>,
    Json(mut payload): Json<EmailAccountConfig>,
) -> Result<StatusCode, StatusCode> {
    // If the frontend sent masked password, preserve the existing one in DB
    if payload.app_password == "••••••••••••••••" {
        if let Ok(existing) = state.db.get_email_accounts() {
            if let Some(found) = existing.into_iter().find(|a| a.id == payload.id) {
                payload.app_password = found.app_password;
            }
        }
    }

    state
        .db
        .upsert_email_account(&payload)
        .map(|_| StatusCode::OK)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn delete_email_account(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    state
        .db
        .delete_email_account(&id)
        .map(|_| StatusCode::OK)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Deserialize)]
struct TestEmailRequest {
    id: Option<String>,
    server: Option<String>,
    port: Option<u16>,
    email: String,
    app_password: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct TestEmailResponse {
    success: bool,
    message: String,
}

async fn test_email_account(
    State(state): State<AppState>,
    Json(req): Json<TestEmailRequest>,
) -> Result<Json<TestEmailResponse>, StatusCode> {
    let server = req.server.unwrap_or_else(|| "imap.gmail.com".to_string());
    let port = req.port.unwrap_or(993);

    // Resolve password if masked or omitted
    let mut password = req.app_password.unwrap_or_default();
    if password == "••••••••••••••••" || password.is_empty() {
        if let Ok(accounts) = state.db.get_email_accounts() {
            if let Some(target) = accounts.into_iter().find(|a| {
                req.id.as_deref() == Some(&a.id) || a.email.eq_ignore_ascii_case(&req.email)
            }) {
                password = target.app_password;
            }
        }
    }

    if password.is_empty() {
        return Ok(Json(TestEmailResponse {
            success: false,
            message: "App password is required for connection testing.".to_string(),
        }));
    }

    let py_script = std::env::var("IMAP_FETCHER_SCRIPT")
        .unwrap_or_else(|_| "scripts/fetch_statements_imap.py".to_string());

    let output = tokio::process::Command::new("python3")
        .arg(&py_script)
        .arg("--test")
        .arg("--server")
        .arg(&server)
        .arg("--port")
        .arg(port.to_string())
        .arg("--email")
        .arg(&req.email)
        .arg("--password")
        .arg(&password)
        .arg("--json")
        .output()
        .await;

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            if let Ok(resp) = serde_json::from_str::<TestEmailResponse>(stdout.trim()) {
                Ok(Json(resp))
            } else {
                let stderr = String::from_utf8_lossy(&out.stderr);
                Ok(Json(TestEmailResponse {
                    success: out.status.success(),
                    message: if out.status.success() {
                        "Connection test succeeded.".to_string()
                    } else {
                        format!("Connection failed: {}", stderr.trim())
                    },
                }))
            }
        }
        Err(e) => Ok(Json(TestEmailResponse {
            success: false,
            message: format!("Failed to execute test runner: {}", e),
        })),
    }
}

async fn openaccountant_report_handler() -> Result<Json<serde_json::Value>, StatusCode> {
    let output = tokio::process::Command::new("python3")
        .arg("scripts/open_accountant.py")
        .arg("--json")
        .output()
        .await;

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
                Ok(Json(val))
            } else {
                eprintln!("[openaccountant] JSON parse error: {}", stdout);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
        Err(e) => {
            eprintln!("[openaccountant] Execution error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}


