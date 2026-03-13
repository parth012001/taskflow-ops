#!/usr/bin/env bash
#
# Captures 7 portfolio screenshots of the TaskFlow app.
#
# What it does:
#   1. Seeds demo data (on top of existing data, non-destructive)
#   2. Triggers productivity score recalculation
#   3. Takes 7 screenshots via Playwright
#   4. Cleans up demo data
#
# Prerequisites:
#   - Dev server running:  npm run dev
#   - Base + productivity seeds already applied
#
# Usage:
#   chmod +x scripts/capture-portfolio.sh
#   ./scripts/capture-portfolio.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo ""
echo "==================================================="
echo "  TaskFlow Portfolio Screenshot Capture"
echo "==================================================="
echo ""

# Check dev server is running
if ! curl -s -o /dev/null http://localhost:3000; then
  echo "ERROR: Dev server not running. Start it with: npm run dev"
  exit 1
fi

# Create output directory
mkdir -p screenshots

# Step 1: Seed demo data
echo "[1/4] Seeding demo data..."
npx tsx scripts/demo-seed.ts

# Step 2: Trigger productivity recalculation (as admin)
echo ""
echo "[2/4] Recalculating productivity scores..."
# Login as admin to get a session cookie, then hit the calculate endpoint
COOKIE_JAR=$(mktemp)
# Get CSRF token
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
# Login
curl -s -c "$COOKIE_JAR" -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@taskflow.com&password=password123&csrfToken=$CSRF" \
  -L -o /dev/null
# Trigger recalculation
CALC_RESULT=$(curl -s -b "$COOKIE_JAR" -X POST http://localhost:3000/api/productivity/calculate)
echo "  Calculation result: $CALC_RESULT"
rm -f "$COOKIE_JAR"

# Step 3: Take screenshots
echo ""
echo "[3/4] Taking screenshots..."
npx playwright test --config scripts/playwright-screenshots.config.ts --project=chromium 2>&1 || {
  echo ""
  echo "WARNING: Some screenshots may have failed. Check output above."
  echo "Continuing to cleanup..."
}

# Step 4: Cleanup
echo ""
echo "[4/4] Cleaning up demo data..."
npx tsx scripts/demo-cleanup.ts

echo ""
echo "==================================================="
echo "  Done! Screenshots saved to ./screenshots/"
echo "==================================================="
ls -la screenshots/*.png 2>/dev/null || echo "  (no screenshots found)"
echo ""
