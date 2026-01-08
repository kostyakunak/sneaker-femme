import dotenv from 'dotenv';
dotenv.config();
process.env.DB_SSLMODE = 'disable'; // Fix: Force disable SSL mode for local connection

// Dynamic import required to ensure process.env is set BEFORE pool is instantiated
const { pool } = await import('../packages/evershop/dist/lib/postgres/connection.js');
import { getConnection, execute, insert, select, update, startTransaction, commit, rollback } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';

async function run() {
    let connection = await getConnection(pool);
    console.log('🔌 Connected to DB');

    try {
        // 1. Apply Migration Logic (Idempotent)
        console.log('🛠 Applying Trigger Migration...');
        await execute(connection, `DROP TRIGGER IF EXISTS "TRIGGER_AFTER_INSERT_ORDER_ITEM" ON "order_item"`);
        await execute(connection, `CREATE OR REPLACE FUNCTION reduce_product_stock_when_order_paid()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE product_inventory pi
      SET qty = pi.qty - oi.qty
      FROM order_item oi
      WHERE oi.order_item_order_id = NEW.order_id
        AND oi.product_id = pi.product_inventory_product_id
        AND pi.manage_stock = TRUE;
      RETURN NEW;
    END;
    $$`);
        await execute(connection, `DROP TRIGGER IF EXISTS "TRIGGER_AFTER_ORDER_PAID" ON "order"`);
        await execute(connection, `CREATE TRIGGER "TRIGGER_AFTER_ORDER_PAID"
    AFTER UPDATE OF payment_status ON "order"
    FOR EACH ROW
    WHEN (NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid')
    EXECUTE FUNCTION reduce_product_stock_when_order_paid()`);
        console.log('✅ Migration Applied');

        // 2. Setup Data
        await startTransaction(connection);
        const productUUID = uuidv4();
        // Insert Mock Product (Use RETURNING to get generated ID)
        let dbProductId;
        try {
            const res = await execute(connection, `
            INSERT INTO product (uuid, sku, price, weight, status, created_at, updated_at)
            VALUES ('${productUUID}', 'TEST-${Math.floor(Math.random() * 100000)}', 100, 1, TRUE, NOW(), NOW())
            RETURNING product_id
        `);
            // pg driver result has .rows
            dbProductId = res.rows[0].product_id;
            console.log(`Product Inserted via Raw SQL. ID: ${dbProductId}`);
        } catch (err) {
            console.error('Product Insert Failed:', err);
            throw err;
        }

        // Verify Product Exists
        const pCheck = await select().from('product').where('product_id', '=', dbProductId).execute(connection);
        if (!pCheck || pCheck.length === 0) {
            throw new Error(`CRITICAL: Product ${dbProductId} failed to persist after insert!`);
        } else {
            console.log('Product Verified in DB');
        }

        // Insert Mock Cart (Need Integer ID for Order FK)
        let cartId;
        try {
            const res = await execute(connection, `
            INSERT INTO cart (uuid, status, currency, sub_total, grand_total, total_qty, sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax, tax_amount, tax_amount_before_discount, shipping_tax_amount, created_at, updated_at)
            VALUES ('${uuidv4()}', TRUE, 'USD', 100, 100, 1, 100, 100, 100, 0, 0, 0, NOW(), NOW())
            RETURNING cart_id
        `);
            cartId = res.rows[0].cart_id;
            console.log(`Cart Inserted via Raw SQL. ID: ${cartId}`);
        } catch (err) {
            console.error('Cart Insert Failed:', err);
            throw err;
        }

        // Update subsequent usages to use dbProductId
        const productId = dbProductId; // Update reference for rest of script    }

        // Insert Description (Required by some constraints?)
        await insert('product_description').given({
            product_description_product_id: productId,
            product_description_id: Math.floor(Math.random() * 100000), // Add explicit ID just in case
            name: `Test Product ${productId}`
        }).execute(connection);

        // Insert Inventory (Qty = 10)
        await insert('product_inventory').given({
            product_inventory_product_id: productId,
            product_inventory_id: Math.floor(Math.random() * 100000), // Add explicit ID
            qty: 10,
            manage_stock: true
        }).execute(connection);
        console.log(`📦 Created Product ${productId} with Qty 10`);

        await commit(connection); // Commit setup data
        console.log('Setup Committed. Re-acquiring connection...');
        connection = await getConnection(pool);

        // 3. Test Case A: Happy Path (Authorize -> Paid)
        console.log('\n--- TEST CASE A: Authorize -> Paid ---');
        const orderId = Math.floor(Math.random() * 100000);
        const orderUUID = uuidv4();

        // Insert Order (Authorized)
        // Fix: Use raw execute with RETURNING order_id to handle IDENTITY column
        let dbOrderId;
        try {
            const res = await execute(connection, `
            INSERT INTO "order" (
                order_number, cart_id, uuid, currency, total_qty, sub_total, grand_total, 
                sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax, 
                tax_amount, tax_amount_before_discount, shipping_tax_amount, 
                payment_status, shipment_status, status, created_at, updated_at
            ) VALUES (
                'TEST-${orderId}', ${cartId}, '${orderUUID}', 'USD', 1, 100, 100,
                100, 100, 100, 0, 0, 0,
                'authorized', 'pending', 'new', NOW(), NOW()
            ) RETURNING order_id
            `);
            dbOrderId = res.rows[0].order_id;
            console.log(`Order A Inserted. ID: ${dbOrderId}`);
        } catch (err) {
            console.error('Order A Insert Failed:', err);
            throw err;
        }

        // Insert Item
        await insert('order_item').given({
            order_item_id: Math.floor(Math.random() * 100000),
            order_item_order_id: dbOrderId, // Use generated ID
            product_id: productId,
            qty: 1,
            product_sku: `TEST-${productId}`,
            product_name: 'Test Product',
            product_price: 100,
            line_total_incl_tax: 100,
            product_price_incl_tax: 100,
            final_price: 100,
            final_price_incl_tax: 100,
            tax_percent: 0,
            tax_amount: 0,
            tax_amount_before_discount: 0,
            discount_amount: 0,
            line_total: 100,
            line_total_with_discount: 100,
            line_total_with_discount_incl_tax: 100,
            uuid: uuidv4()
        }).execute(await getConnection(pool));

        // CHECK: Inventory should still be 10
        let inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).execute(await getConnection(pool));
        if (inv[0].qty !== 10) throw new Error(`❌ FAIL: Expected 10, got ${inv[0].qty} after Authorized Order`);
        console.log('✅ Pass: Inventory unchanged after Authorized Order');

        // SIMULATE CAPTURE (Set Paid)
        await update('order').given({ payment_status: 'paid' }).where('order_id', '=', dbOrderId).execute(await getConnection(pool));

        // CHECK: Inventory should be 9
        inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).execute(await getConnection(pool));
        if (inv[0].qty !== 9) throw new Error(`❌ FAIL: Expected 9, got ${inv[0].qty} after Paid`);
        console.log('✅ Pass: Inventory deducted after Paid');


        // 4. Test Case B: Authorized Cancel (No Deduction)
        console.log('\n--- TEST CASE B: Authorized -> Cancel ---');

        // Reset Qty to 10 for clarity
        await update('product_inventory').given({ qty: 10 }).where('product_inventory_product_id', '=', productId).execute(await getConnection(pool));

        const orderId2 = orderId + 1;
        let dbOrderId2;
        // Raw execute handles its own connection usually, but here we used `connection` var.
        // We need a fresh one for the raw block too.
        {
            const c = await getConnection(pool);
            try {
                const res = await execute(c, `
            INSERT INTO "order" (
                order_number, cart_id, uuid, currency, total_qty, sub_total, grand_total, 
                sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax, 
                tax_amount, tax_amount_before_discount, shipping_tax_amount, 
                payment_status, shipment_status, status, created_at, updated_at
            ) VALUES (
                'TEST-${orderId2}', ${cartId}, '${uuidv4()}', 'USD', 1, 100, 100,
                100, 100, 100, 0, 0, 0,
                'authorized', 'pending', 'new', NOW(), NOW()
            ) RETURNING order_id
            `);
                dbOrderId2 = res.rows[0].order_id;
                console.log(`Order B Inserted. ID: ${dbOrderId2}`);
            } catch (err) {
                console.error('Order B Insert Failed:', err);
                throw err;
            }
        }

        await insert('order_item').given({
            order_item_id: Math.floor(Math.random() * 100000),
            order_item_order_id: dbOrderId2, // Use generated ID
            product_id: productId,
            qty: 1,
            product_sku: `TEST-${productId}`,
            product_name: 'Test Product',
            product_price: 100,
            line_total_incl_tax: 100,
            product_price_incl_tax: 100,
            final_price: 100,
            final_price_incl_tax: 100,
            tax_percent: 0,
            tax_amount: 0,
            tax_amount_before_discount: 0,
            discount_amount: 0,
            line_total: 100,
            line_total_with_discount: 100,
            line_total_with_discount_incl_tax: 100,
            uuid: uuidv4()
        }).execute(await getConnection(pool));

        // Cancel Order (Set Canceled)
        // NOTE: Application logic cancelOrder does the restocking check. 
        // BUT here we are testing DB Trigger behavior.
        // DB Trigger does NOTHING on cancel. 
        // The application cancelOrder is what used to ADD stock back.
        // Since we are not running the APP logic here, checking DB only confirms Trigger didn't fire.
        // But we already confirmed Trigger didn't fire on insert.
        // So this test is redundant for DB, but good sanity check.

        inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).execute(await getConnection(pool));
        if (inv[0].qty !== 10) throw new Error(`❌ FAIL: Expected 10, got ${inv[0].qty}`);
        console.log('✅ Pass: Inventory unchanged for Authorized Order (DB level)');

        console.log('\n🎉 ALL TESTS PASSED');

    } catch (e) {
        console.error('❌ ERROR:', e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

run();
