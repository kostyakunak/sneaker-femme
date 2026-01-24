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


echo "🧹 Cleaning up old processes and caches..."
for P in 3000 5186; do
  PID=$(lsof -ti :$P)
  if [ -n "$PID" ]; then
    echo "⚠️  Port $P is in use. Killing PID $PID..."
    kill -9 $PID
  fi
done
rm -rf extensions/supplier_sync/dist
echo "✅  Cleaning done."

# Check and start Docker database
echo "🗄️  Checking database connection..."
if ! docker ps > /dev/null 2>&1; then
  echo "🐳 Starting Docker..."
  open -a Docker
  echo "⏳ Waiting for Docker to start..."
  sleep 5
fi

# Start database if not running
if ! docker ps | grep -q "evershop-dev-database-1"; then
  echo "🚀 Starting database container..."
  docker-compose up -d database
  echo "⏳ Waiting for database to be ready..."
  sleep 3
fi

# Wait for database to be ready
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if docker exec evershop-dev-database-1 psql -U postgres -d evershop -c "SELECT 1;" > /dev/null 2>&1 || timeout 2 bash -c 'PGPASSWORD=postgres psql -h localhost -U postgres -d evershop -p 5433 -c "SELECT 1;" > /dev/null 2>&1'; then
    echo "✅ Database is ready!"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo "⏳ Waiting for database... ($ATTEMPT/$MAX_ATTEMPTS)"
  sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "❌ Database connection timeout! Please check Docker and database."
  exit 1
fi

# 1. Compile the project
echo "📦 Compiling project..."
npm run compile
if [ $? -ne 0 ]; then
  echo "❌ Compilation failed!"
  exit 1
fi

# 2. Start in DEV mode directly from source
# Using the fixed npm run dev which uses npx tsx
echo "🚀  Starting in DEV mode directly from SOURCE (Fast & Reliable)..."
npm run dev
