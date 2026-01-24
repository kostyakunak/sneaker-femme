#!/bin/bash
echo "Dumping schema from Container 'database'..."
docker-compose exec -T database pg_dump -U postgres -d postgres --schema-only > schema.sql

if [ $? -eq 0 ]; then
    echo "Schema dump successful."
else
    echo "Schema dump failed."
    exit 1
fi

echo "Restoring schema to Container 'postgres-test'..."
# We pipe the schema file into psql inside the test container
cat schema.sql | docker-compose -f docker-compose.test.yml exec -T postgres-test psql -U admin -d evershop_test

if [ $? -eq 0 ]; then
    echo "Schema restore successful."
    rm schema.sql
else
    echo "Schema restore failed."
    exit 1
fi
