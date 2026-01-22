#!/bin/bash

PROJECT_DIR="/Users/kostakunak/Desktop/solovey/evershop-dev"
PORT=5186
URL="http://localhost:$PORT/admin"
SKIP_BUILD=false
DEV_MODE=false

# Export PORT for the application
export PORT=$PORT

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -s|--skip-build) SKIP_BUILD=true ;;
        -d|--dev) DEV_MODE=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Ensure we use Node 22
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

cd "$PROJECT_DIR" || exit

echo "=========================================="
echo "🚀  STARTING EVERSHOP DROPSHIPPING SYSTEM"
echo "=========================================="
echo ""

# 0. Cleanup: Stop existing Evershop processes
echo "🧹  Cleaning up previous sessions..."
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

# 3. Handle Build and Start
# ALWAYS run incremental compilation to sync src -> dist
echo "🔄  Syncing source changes (src -> dist)..."
npm run compile

if [ "$DEV_MODE" = true ]; then
    echo "🛠️  Starting in Development Mode (Fast startup)..."
    npm run dev
else
    BUILD_PATH=".evershop/build"
    if [ "$SKIP_BUILD" = true ]; then
        if [ ! -d "$BUILD_PATH" ]; then
            echo "⚠️  Build directory not found. Forcing a build..."
            SKIP_BUILD=false
        else
            echo "⏩  Skipping build as requested..."
        fi
    fi

    if [ "$SKIP_BUILD" = false ]; then
        echo "📦  Building for Production (This may take a minute)..."
        # Since we already ran compile at step 3, we can safely build
        npm run build
        echo ""
    fi

    echo "🚀  Starting Production Server..."
    npm start
fi
