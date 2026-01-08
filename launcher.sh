#!/bin/bash

# Configuration
PROJECT_DIR="/Users/kostakunak/Desktop/solovey/evershop-dev"
URL="http://localhost:3000/admin"

# Ensure we use Node 22
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

cd "$PROJECT_DIR" || exit

echo "=========================================="
echo "🚀  STARTING EVERSHOP DROPSHIPPING SYSTEM"
echo "=========================================="
echo ""

# 0. Cleanup: Stop existing Evershop processes
echo "🧹  Cleaning up previous sessions..."
PORT=3000
PID=$(lsof -ti :$PORT)
if [ ! -z "$PID" ]; then
    echo "🧹  Stopping process on port $PORT (PID: $PID)..."
    kill -9 $PID 2>/dev/null
    sleep 2
fi

# 1. Start PostgreSQL if not running
echo "🐘  Checking PostgreSQL..."
if ! pg_isready > /dev/null 2>&1; then
    echo "🐘  Starting PostgreSQL via Homebrew..."
    brew services start postgresql@14
    sleep 3
else
    echo "🐘  PostgreSQL is already running."
fi

# 2. Open browser in the background after a delay (Evershop takes ~30s to start)
echo "🔗  Admin URL: $URL"
(sleep 35 && open "$URL") &

# 3. Run Evershop in Production Mode (Faster)
echo "📦  Building for Production (This may take a minute)..."
npm run build
echo ""

echo "🚀  Starting Production Server..."
npm start
