#!/usr/bin/env bash
# ==============================================================================
# AIO Wealth Hub - macOS Launchd Daily Background Sync Setup (Twice Daily)
# Configures a persistent, silent background agent at 08:00 AM & 08:00 PM
# ==============================================================================

set -euo pipefail

PLIST_NAME="com.iamabhishekt.aiowealth.sync"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$PLIST_NAME.plist"
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/fetch_statements_imap.py"
HOT_FOLDER="$HOME/Documents/AIO-Wealth-Statements"

mkdir -p "$LAUNCH_AGENTS_DIR"
mkdir -p "$HOT_FOLDER"

echo "==> Configuring AIO Wealth Hub Automated Twice-Daily Sync..."

cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$PLIST_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$SCRIPT_PATH</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <!-- 08:00 AM Daily Run -->
        <dict>
            <key>Hour</key>
            <integer>8</integer>
            <key>Minute</key>
            <integer>0</integer>
        </dict>
        <!-- 08:00 PM Daily Run -->
        <dict>
            <key>Hour</key>
            <integer>20</integer>
            <key>Minute</key>
            <integer>0</integer>
        </dict>
    </array>
    <key>StandardOutPath</key>
    <string>/tmp/aio_wealth_sync.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/aio_wealth_sync_err.log</string>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

echo "==> Launchd plist written to: $PLIST_PATH"

# Unload previous instance if running
launchctl unload "$PLIST_PATH" 2>/dev/null || true
# Load new instance
launchctl load "$PLIST_PATH"

echo "==> Service active. Status:"
launchctl list | grep "$PLIST_NAME" || true
echo "==> Scheduled: Runs daily at 08:00 AM and 08:00 PM."
echo "==> Hot folder: $HOT_FOLDER"
echo "==> Log: /tmp/aio_wealth_sync.log"
