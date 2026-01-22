#!/bin/bash

PROJECT_DIR="/Users/kostakunak/Desktop/solovey/evershop-dev"
PORT=5186
URL="http://localhost:$PORT/admin"

# Export PATH for Node 22
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
export PORT=$PORT

cd "$PROJECT_DIR" || exit

echo "=========================================="
echo "⚡  FAST DEV LAUNCHER"
echo "=========================================="


echo "🧹 Checking for existing processes on port $PORT..."
# Find PID occupying the port
PID=$(lsof -ti :$PORT)

if [ -n "$PID" ]; then
  echo "⚠️  Port $PORT is in use by PID $PID. Killing it..."
  kill -9 $PID
  echo "✅  Killed old process."
else
  echo "✅  Port $PORT is free."
fi

# 1. Start in DEV mode directly from source
# Using the fixed npm run dev which uses npx tsx
echo "🚀  Starting in DEV mode directly from SOURCE (Fast & Reliable)..."
npm run dev
