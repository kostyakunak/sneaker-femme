#!/usr/bin/env bash
set -euo pipefail

# Start Docker containers
docker compose -f docker-compose.test.yml up -d

echo "Waiting for Postgres..."
# Wait for Postgres to be ready
until docker exec $(docker ps -q -f name=postgres-test) pg_isready -U admin -d evershop_test >/dev/null 2>&1; do
  sleep 1
done
echo "Postgres is ready."

# Database connection settings
export DB_PORT=5433
export DB_HOST=localhost
export DB_USER=admin
export DB_PASSWORD=password
export DB_NAME=evershop_test
export NODE_ENV=test

# Compile source code
# echo "Compiling..."
# npm run compile
# npm run compile:db

# Run setup and migrations
echo "Running installation/migration..."
# node ./packages/evershop/dist/bin/install/index.js || true
# Bypass install and load dump directly due to broken build environment
echo "Loading database schema from dump..."
cat evershop_dump.sql | docker exec -i $(docker ps -q -f name=postgres-test) psql -U admin -d evershop_test > /dev/null 2>&1 || echo "Dump import failed or already exists"

# Run Tests
echo "Running DB Tests..."
npm run test:db

echo "Running Job Tests..."
npm run test:job

echo "Running E2E Tests..."
npm run test:e2e

echo "All tests completed."
