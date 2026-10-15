#!/usr/bin/env bash
# ==============================================================================
# AIO Wealth Hub — Complete Build, Sync & Launch Script
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================================="
echo "          AIO Wealth Hub — Master Build & Start Sequence                  "
echo "=========================================================================="

# 1. Environment & Database Check
if [ ! -f .env ]; then
    echo "[!] .env not found. Please ensure your keys are configured."
fi

# 2. Build Rust Backend
echo "--> [1/4] Building Rust Backend (aio-wealth-server)..."
cargo build --manifest-path backend/Cargo.toml

# 3. Synchronize Live Data Feeds & Connectors
echo "--> [2/4] Ingesting Live SimpleFIN Institutions & Robinhood Holdings..."
python3 scripts/sync_simplefin.py || true

echo "--> Ingesting Wallos Subscriptions & Recurring Bills..."
python3 scripts/wallos_tracker.py || true

echo "--> Synchronizing HDFC Loan, Remitly, Crobo & Live FX Rates..."
python3 scripts/sync_connectors.py || true

echo "--> Running TypeSafe Jev LLM Transaction Categorization..."
python3 scripts/classify_jev.py || true

# 4. Stop any old backend instance
echo "--> [3/4] Starting Rust Backend API on port 8088..."
pkill -f aio-wealth-server || true
./backend/target/debug/aio-wealth-server &
BACKEND_PID=$!
echo "    Backend running on PID $BACKEND_PID (http://localhost:8088)"

# 5. Build & Start Frontend
echo "--> [4/4] Starting Vite Frontend on port 5173..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo "=========================================================================="
echo "  Vault Operational:"
echo "   - Frontend UI:       http://localhost:5173"
echo "   - Rust Backend API:  http://localhost:8088"
echo "   - Wallos Database:   $SCRIPT_DIR/wallos.db"
echo "   - Ledger SQLite:     $SCRIPT_DIR/aio_wealth.sqlite"
echo "=========================================================================="
echo "Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM
wait
