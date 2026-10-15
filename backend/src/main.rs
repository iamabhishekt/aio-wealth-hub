use aio_wealth_core::*;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct AppState {
    db: LedgerDb,
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

    let state = AppState { db };

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
        "cost": "$0.00 (100% free / local)"
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

    let income = params.monthly_income.unwrap_or(6000.0);
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
    status: String,
}

async fn sync_splitwise(
    State(state): State<AppState>,
    Json(req): Json<SplitwiseSyncRequest>,
) -> Result<Json<SplitwiseSyncResponse>, StatusCode> {
    let connector = SplitwiseConnector::new(req.api_key);
    match connector.fetch_net_balance().await {
        Ok(balance) => {
            let account = Account {
                id: "splitwise-net".to_string(),
                name: "Splitwise Net Balance".to_string(),
                account_type: AccountType::SplitwiseNetBalance,
                currency: Currency::USD,
                balance,
                apr: None,
                monthly_min_payment: None,
                institution: "Splitwise".to_string(),
                updated_at: chrono::Utc::now(),
            };
            let _ = state.db.upsert_account(&account);
            Ok(Json(SplitwiseSyncResponse {
                net_balance_usd: balance,
                status: "synced".to_string(),
            }))
        }
        Err(e) => {
            eprintln!("Splitwise sync failed: {}", e);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}
