
import dotenv from 'dotenv';
dotenv.config();
process.env.DB_SSLMODE = 'disable';

// Mock Stripe
class MockStripe {
    paymentIntents: any;
    constructor() {
        this.paymentIntents = {
            capture: async (id) => {
                if (id === 'pi_fail') return { status: 'failed' };
                console.log(`[MockStripe] Captured ${id}`);
                return { status: 'succeeded' };
            },
            cancel: async (id) => {
                console.log(`[MockStripe] Canceled ${id}`);
                return { status: 'canceled' };
            }
        };
    }
}

async function run() {
    // Dynamic imports
    const { supplierSyncAndConfirm } = await import('../extensions/supplier_sync/src/services/supplierSyncAndConfirm.ts');
    const { execute, insert, select, getConnection } = await import('@evershop/postgres-query-builder');
    const { pool } = await import('../packages/evershop/dist/lib/postgres/connection.js');

    // Helpers
    const runQuery = async (queryBuilder) => {
        const c = await getConnection(pool);
        return await queryBuilder.execute(c);
    };

    const runExecute = async (sql) => {
        const c = await getConnection(pool);
        return await execute(c, sql);
    };

    try {
        console.log('--- Setup Data ---');
        await setupData({ runQuery, runExecute, insert });

        console.log('--- Run Sync Job ---');
        const mockStripe = new MockStripe();
        await supplierSyncAndConfirm(mockStripe);

        console.log('--- Verification ---');

        // Scenario 1: Race Condition
        // Order 1 (2/3) -> Paid?
        const o1 = await runQuery(select().from('order').where('order_number', '=', 'ORD-1'));
        console.log(`ORD-1: payment_status=${o1[0]?.payment_status} (Expected: paid), status=${o1[0]?.status} (Expected: processing)`);

        // Order 2 (2/remaining 1) -> Canceled?
        const o2 = await runQuery(select().from('order').where('order_number', '=', 'ORD-2'));
        console.log(`ORD-2: payment_status=${o2[0]?.payment_status} (Expected: canceled), status=${o2[0]?.status} (Expected: canceled)`);

        // Scenario 2: Multi-Item (Fail)
        const o3 = await runQuery(select().from('order').where('order_number', '=', 'ORD-3'));
        console.log(`ORD-3: payment_status=${o3[0]?.payment_status} (Expected: canceled), status=${o3[0]?.status} (Expected: canceled)`);

        // Scenario 3: Capture Fail
        const o4 = await runQuery(select().from('order').where('order_number', '=', 'ORD-4'));
        console.log(`ORD-4: payment_status=${o4[0]?.payment_status} (Expected: authorized), status=${o4[0]?.status} (Expected: new)`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

async function setupData(tools) {
    const { runQuery, runExecute, insert } = tools;
    const { v4: uuidv4 } = await import('uuid');

    // Clear tables
    await runExecute('DELETE FROM "order"');
    await runExecute('DELETE FROM order_item');
    await runExecute('DELETE FROM product_inventory');
    await runExecute('DELETE FROM payment_transaction');
    await runExecute('DELETE FROM product');
    await runExecute('DELETE FROM cart');

    // Create Mock Cart
    const createCart = async () => {
        const sql = `INSERT INTO cart (uuid, status, currency, sub_total, grand_total, total_qty, sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax, tax_amount, tax_amount_before_discount, shipping_tax_amount, created_at, updated_at)
        VALUES ('${uuidv4()}', TRUE, 'USD', 100, 100, 1, 100, 100, 100, 0, 0, 0, NOW(), NOW())
        RETURNING cart_id`;
        const c = await runExecute(sql);
        return c.rows[0].cart_id;
    };
    const cartId = await createCart();

    // 1. Race Condition Data
    // Create Products & Inventory using Raw SQL for Product to get Returning ID
    const createProd = async (sku) => {
        const sql = `INSERT INTO product (sku, type, status, price) VALUES ('${sku}', 'simple', TRUE, 100) RETURNING product_id`;
        const p = await runExecute(sql);
        const pid = p.rows[0].product_id;

        await runQuery(insert('product_inventory').given({
            product_inventory_product_id: pid,
            qty: 3, // Default
            manage_stock: true,
            stock_availability: true
        }));
        return pid;
    };

    const pid1 = await createProd('P101');
    const pid2 = await createProd('P201');
    const pid3 = await createProd('P202');
    const pid4 = await createProd('P301');

    // Update quantities for specific scenarios
    // Scenario 2: Multi (pid2, pid3 -> qty 5)
    await runExecute(`UPDATE product_inventory SET qty = 5 WHERE product_inventory_product_id IN (${pid2}, ${pid3})`);

    // Scenario 3: Fail (pid4 -> qty 10)
    await runExecute(`UPDATE product_inventory SET qty = 10 WHERE product_inventory_product_id = ${pid4}`);

    // Order 1: Qty 2 (Auth)
    await createOrder(tools, 'ORD-1', pid1, 2, 'pi_1', cartId);

    // Order 2: Qty 2 (Auth)
    await createOrder(tools, 'ORD-2', pid1, 2, 'pi_2', cartId);

    // Order 3: Prod B (3) + Prod C (10 - Fail)
    await createOrderMulti(tools, 'ORD-3', [
        { pid: pid2, qty: 3 },
        { pid: pid3, qty: 10 }
    ], 'pi_3', cartId);

    // Order 4: Fail Capture
    await createOrder(tools, 'ORD-4', pid4, 1, 'pi_fail', cartId);
}

async function createOrder(tools, number, pid, qty, piId, cartId) {
    const { runQuery, runExecute, insert } = tools;
    const { v4: uuidv4 } = await import('uuid');

    // Explicitly null handling or defaults
    const sql = `INSERT INTO "order" (
        order_number, uuid, cart_id, payment_status, shipment_status, status, currency, total_qty, 
        sub_total, sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax,
        tax_amount, tax_amount_before_discount, shipping_tax_amount, grand_total, 
        created_at, updated_at
    ) VALUES (
        '${number}', '${uuidv4()}', ${cartId}, 'authorized', 'pending', 'new', 'USD', ${qty},
        100, 100, 100, 100, 
        0, 0, 0, 100,
        NOW(), NOW()
    ) RETURNING order_id`;

    const res = await runExecute(sql);
    const oid = res.rows[0].order_id;

    await runQuery(insert('order_item').given({
        order_item_order_id: oid,
        product_id: pid,
        qty: qty,
        product_name: 'Test Product',
        product_sku: 'TEST',
        product_price: 50,
        product_price_incl_tax: 50,
        final_price: 50,
        final_price_incl_tax: 50,
        tax_percent: 0,
        tax_amount: 0,
        tax_amount_before_discount: 0,
        discount_amount: 0,
        line_total: 100,
        line_total_with_discount: 100,
        line_total_with_discount_incl_tax: 100,
        line_total_incl_tax: 100,
        uuid: uuidv4()
    }));

    await runQuery(insert('payment_transaction').given({
        payment_transaction_order_id: oid,
        transaction_id: piId,
        transaction_type: 'online',
        payment_action: 'authorize',
        amount: 100,
        created_at: new Date()
    }));
    return oid;
}

async function createOrderMulti(tools, number, items, piId, cartId) {
    const { runQuery, runExecute, insert } = tools;
    const { v4: uuidv4 } = await import('uuid');
    const totalQty = items.reduce((a, b) => a + b.qty, 0);

    const sql = `INSERT INTO "order" (
        order_number, uuid, cart_id, payment_status, shipment_status, status, currency, total_qty, 
        sub_total, sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax,
        tax_amount, tax_amount_before_discount, shipping_tax_amount, grand_total, 
        created_at, updated_at
    ) VALUES (
        '${number}', '${uuidv4()}', ${cartId}, 'authorized', 'pending', 'new', 'USD', ${totalQty},
        100, 100, 100, 100, 
        0, 0, 0, 100,
        NOW(), NOW()
    ) RETURNING order_id`;

    const res = await runExecute(sql);
    const oid = res.rows[0].order_id;

    for (const i of items) {
        await runQuery(insert('order_item').given({
            order_item_order_id: oid,
            product_id: i.pid,
            qty: i.qty,
            product_name: 'Test P',
            product_sku: 'TEST',
            product_price: 10,
            product_price_incl_tax: 10,
            final_price: 10,
            final_price_incl_tax: 10,
            tax_percent: 0,
            tax_amount: 0,
            tax_amount_before_discount: 0,
            discount_amount: 0,
            line_total: 10 * i.qty,
            line_total_with_discount: 10 * i.qty,
            line_total_with_discount_incl_tax: 10 * i.qty,
            line_total_incl_tax: 10 * i.qty,
            uuid: uuidv4()
        }));
    }

    await runQuery(insert('payment_transaction').given({
        payment_transaction_order_id: oid,
        transaction_id: piId,
        transaction_type: 'online',
        payment_action: 'authorize',
        amount: 100
    }));
    return oid;
}

run();
