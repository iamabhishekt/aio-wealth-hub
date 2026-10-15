// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use aio_wealth_core::{Account, ForecastResult, LedgerDb, Subscription, WealthForecaster};
use std::sync::Mutex;
use tauri::State;

struct AppState {
    db: Mutex<LedgerDb>,
}

#[tauri::command]
fn get_accounts(state: State<AppState>) -> Result<Vec<Account>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_all_accounts().map_err(|e| e.to_string())
}

#[tauri::command]
fn compute_forecast(
    state: State<AppState>,
    monthly_income: f64,
    fx_rate: f64,
) -> Result<ForecastResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let accounts = db.get_all_accounts().map_err(|e| e.to_string())?;
    let subs = db.get_subscriptions().map_err(|e| e.to_string())?;
    Ok(WealthForecaster::compute_snapshot(&accounts, &subs, monthly_income, fx_rate))
}

fn main() {
    let app_dir = dirs_fallback();
    let db_path = format!("{}/aio_wealth.sqlite", app_dir);
    let db = LedgerDb::open_file(&db_path).unwrap_or_else(|_| LedgerDb::new_in_memory().unwrap());

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(db),
        })
        .invoke_handler(tauri::generate_handler![get_accounts, compute_forecast])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn dirs_fallback() -> String {
    std::env::var("HOME").unwrap_or_else(|_| ".".to_string())
}
