use crate::connectors::{SplitwiseConnector, StatementParser};
use crate::ledger::LedgerDb;
use crate::models::{Account, AccountType, Currency};
use anyhow::Result;
use chrono::Utc;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
pub struct SyncReport {
    pub files_scanned: usize,
    pub transactions_imported: usize,
    pub splitwise_synced: bool,
    pub splitwise_balance_usd: Option<f64>,
    pub timestamp: String,
    pub status: String,
}

#[derive(Clone)]
pub struct SyncDaemon {
    pub hot_folder: PathBuf,
    pub splitwise_api_key: Option<String>,
    pub db_path: PathBuf,
}

impl SyncDaemon {
    pub fn new(hot_folder: PathBuf, splitwise_api_key: Option<String>, db_path: PathBuf) -> Self {
        // Ensure hot folder and processed subfolder exist
        let processed = hot_folder.join("processed");
        let _ = fs::create_dir_all(&processed);
        Self {
            hot_folder,
            splitwise_api_key,
            db_path,
        }
    }

    /// Default hot folder path: ~/Documents/AIO-Wealth-Statements
    pub fn default_hot_folder() -> PathBuf {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join("Documents").join("AIO-Wealth-Statements")
    }

    /// Single execution run: scans hot folder for statements and syncs Splitwise
    pub async fn run_sync_cycle(&self, db: &LedgerDb) -> Result<SyncReport> {
        // Step 1: If any email accounts are enabled, run automated IMAP statement fetcher
        if let Ok(accounts) = db.get_email_accounts() {
            let enabled_count = accounts.iter().filter(|a| a.enabled).count();
            if enabled_count > 0 {
                println!(
                    "[aio-wealth-daemon] Triggering automated IMAP fetch for {} enabled account(s)...",
                    enabled_count
                );
                let py_script = std::env::var("IMAP_FETCHER_SCRIPT")
                    .unwrap_or_else(|_| "scripts/fetch_statements_imap.py".to_string());

                let res = tokio::process::Command::new("python3")
                    .arg(&py_script)
                    .arg("--db")
                    .arg(&self.db_path)
                    .arg("--hot-folder")
                    .arg(&self.hot_folder)
                    .output()
                    .await;

                if let Err(e) = res {
                    eprintln!("[aio-wealth-daemon] Note: Automated IMAP fetch script invocation skipped: {}", e);
                }
            }
        }

        let mut files_scanned = 0;
        let mut total_imported = 0;

        let processed_dir = self.hot_folder.join("processed");
        let _ = fs::create_dir_all(&processed_dir);

        if let Ok(entries) = fs::read_dir(&self.hot_folder) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let ext = path
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("")
                        .to_lowercase();

                    if ext == "csv" || ext == "ofx" || ext == "qfx" {
                        files_scanned += 1;
                        if let Ok(content) = fs::read_to_string(&path) {
                            let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                            let txs = if file_name.contains("apple") {
                                StatementParser::parse_apple_card_csv(&content, "us-apple-card")
                            } else if file_name.contains("amex") {
                                StatementParser::parse_amex_csv(&content, "us-amex-card")
                            } else if file_name.contains("chase") {
                                StatementParser::parse_amex_csv(&content, "us-chase-credit")
                            } else if ext == "ofx" || ext == "qfx" {
                                StatementParser::parse_ofx_statement(&content, "auto-ofx-import")
                            } else {
                                StatementParser::parse_apple_card_csv(&content, "auto-csv-import")
                            };

                            total_imported += txs.len();

                            // Move to processed folder so it's not processed twice
                            let dest = processed_dir.join(path.file_name().unwrap());
                            let _ = fs::rename(&path, &dest);
                        }
                    }
                }
            }
        }

        let mut splitwise_synced = false;
        let mut splitwise_balance = None;

        if let Some(key) = &self.splitwise_api_key {
            if !key.trim().is_empty() {
                let connector = SplitwiseConnector::new(key.clone());
                if let Ok(bal) = connector.fetch_net_balance().await {
                    splitwise_synced = true;
                    splitwise_balance = Some(bal);
                    let acc = Account {
                        id: "splitwise-net".to_string(),
                        name: "Splitwise Net Balance".to_string(),
                        account_type: AccountType::SplitwiseNetBalance,
                        currency: Currency::USD,
                        balance: bal,
                        apr: None,
                        monthly_min_payment: None,
                        institution: "Splitwise".to_string(),
                        updated_at: Utc::now(),
                    };
                    let _ = db.upsert_account(&acc);
                }
            }
        }

        Ok(SyncReport {
            files_scanned,
            transactions_imported: total_imported,
            splitwise_synced,
            splitwise_balance_usd: splitwise_balance,
            timestamp: Utc::now().to_rfc3339(),
            status: "Completed".to_string(),
        })
    }

    /// Spawn background loop executing twice per day (every 12 hours)
    pub fn spawn_background_scheduler(self, db: LedgerDb) {
        tokio::spawn(async move {
            println!(
                "[aio-wealth-daemon] Background scheduler started. Watching: {}",
                self.hot_folder.display()
            );
            // Run immediately on boot
            let _ = self.run_sync_cycle(&db).await;

            // Then interval of 12 hours (43,200 seconds)
            let mut interval = tokio::time::interval(Duration::from_secs(12 * 3600));
            loop {
                interval.tick().await;
                println!("[aio-wealth-daemon] Triggering scheduled 12-hour sync cycle...");
                match self.run_sync_cycle(&db).await {
                    Ok(rep) => {
                        println!(
                            "[aio-wealth-daemon] Sync completed: {} files, {} txs",
                            rep.files_scanned, rep.transactions_imported
                        );
                    }
                    Err(e) => {
                        eprintln!("[aio-wealth-daemon] Scheduled sync error: {}", e);
                    }
                }
            }
        });
    }
}
