#!/usr/bin/env bash
# AIO Wealth Hub - Launch Chrome with Remote Debugging for Zero-Risk Authenticated Browser Ingestion
# Allows AIO Wealth agent to read logged-in portals (Paychex, banks) without asking for your passwords or triggering 2FA blocks.

PORT=9222
USER_DATA_DIR="$HOME/.aio-wealth-chrome-profile"

echo "=================================================="
echo "  🌐 Launching Chrome with CDP on port $PORT     "
echo "  Profile directory: $USER_DATA_DIR              "
echo "=================================================="

mkdir -p "$USER_DATA_DIR"

if [ -d "/Applications/Google Chrome.app" ]; then
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
        --remote-debugging-port=$PORT \
        --user-data-dir="$USER_DATA_DIR" \
        --no-first-run \
        "https://myapps.paychex.com" &
    echo "Chrome launched! Please log in to Paychex in this window."
else
    echo "Error: Google Chrome not found in /Applications/Google Chrome.app"
fi
