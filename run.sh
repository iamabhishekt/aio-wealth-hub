#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=================================================="
echo "  🚀 Starting AIO Wealth Hub (Rust + Vite)       "
echo "  Cost: \$0.00 | Local SQLite & Keychain Vault    "
echo "=================================================="

# Ensure backend is compiled
cargo build --manifest-path backend/Cargo.toml

# Start Rust backend server on port 8088
./backend/target/debug/aio-wealth-server &
BACKEND_PID=$!

echo "[aio-wealth-hub] Backend running on http://localhost:8088 (PID: $BACKEND_PID)"

trap "echo '[aio-wealth-hub] Shutting down...'; kill $BACKEND_PID 2>/dev/null || true" EXIT INT TERM

# Start Vite frontend dev server on port 5173
cd frontend
npm run dev
