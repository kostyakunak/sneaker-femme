import { execute } from '@evershop/postgres-query-builder';

export default async function (connection) {
    // Add supplier_sku and supplier_source columns to product table
    await execute(
        connection,
        `ALTER TABLE "product" 
     ADD COLUMN IF NOT EXISTS "supplier_sku" varchar NULL,
     ADD COLUMN IF NOT EXISTS "supplier_source" varchar NULL`
    );

    // Add a unique index on supplier_sku to prevent duplicates equivalent to supplier products
    // Note: Depending on logic, multiple local products might map to same supplier SKU if they are just variants, 
    // but usually for simple mapping 1-to-1 is preferred or 1-to-many. 
    // Let's just index it for performance for now without unique constraint to allow flexibility.
    await execute(
        connection,
        `CREATE INDEX IF NOT EXISTS "IDX_PRODUCT_SUPPLIER_SKU" ON "product" ("supplier_sku")`
    );
}

export async function down(connection) {
    await execute(
        connection,
        `ALTER TABLE "product" 
     DROP COLUMN "supplier_sku",
     DROP COLUMN "supplier_source"`
    );
}
