
import {
    select,
    update
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import { TestFactory } from '../helpers/factory';

// Test DB Config
const dbConfig = {
    user: 'admin',
    password: 'password',
    host: 'localhost',
    database: 'evershop_test',
    port: 5433
};

const pool = new Pool(dbConfig);
const factory = new TestFactory(pool);

describe('DB Inventory Triggers', () => {
    let productId;
    let sku;

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        await factory.setup();
        const product = await factory.createProduct({ qty: 10 });
        productId = product.productId;
        sku = product.sku;
    });

    test('Order creation does NOT deduct stock (Authorized only)', async () => {
        // Create Order
        const { orderId } = await factory.createOrder({
            payment_status: 'pending',
            status: 'pending'
        });

        // Add Item
        await factory.addOrderItem(orderId, { productId, sku }, { qty: 1 });

        // Transition to Authorized
        await update('order')
            .given({ payment_status: 'authorized' })
            .where('order_id', '=', orderId)
            .execute(pool);

        // Check Stock: Should still be 10 (Evershop only deducts on PAID in this version)
        const inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).load(pool);

        expect(inv.qty).toBe(10);
    });

    test('Paid order DEDUCTS stock', async () => {
        const { orderId } = await factory.createOrder({
            payment_status: 'authorized',
            status: 'pending'
        });

        await factory.addOrderItem(orderId, { productId, sku }, { qty: 1 });

        // Initial check: 10
        let inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).load(pool);
        expect(inv.qty).toBe(10);

        // Transition to Paid
        await update('order')
            .given({ payment_status: 'paid' })
            .where('order_id', '=', orderId)
            .execute(pool);

        // Check Stock: Should be 9
        inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).load(pool);
        expect(inv.qty).toBe(9);
    });

    test('Cancel Paid order does NOT restore stock (No DB Trigger)', async () => {
        // Create Paid Order
        const { orderId } = await factory.createOrder({
            payment_status: 'paid',
            status: 'processing'
        });

        await factory.addOrderItem(orderId, { productId, sku }, { qty: 2 });

        // Note: The trigger fires on UPDATE payment_status to 'paid'. 
        // If we insert as 'paid', it might not fire depending on trigger definition (AFTER UPDATE).
        // Let's force an update to be sure.
        await update('order').given({ payment_status: 'pending' }).where('order_id', '=', orderId).execute(pool);
        await update('order').given({ payment_status: 'paid' }).where('order_id', '=', orderId).execute(pool);

        let inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).load(pool);
        expect(inv.qty).toBe(8);

        // Cancel
        await update('order').given({ payment_status: 'canceled' }).where('order_id', '=', orderId).execute(pool);

        // Check Stock: Remains 8
        inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).load(pool);
        expect(inv.qty).toBe(8);
    });

    test('Cancel Authorized order remains at 10', async () => {
        const { orderId } = await factory.createOrder({
            payment_status: 'authorized',
            status: 'pending'
        });

        await factory.addOrderItem(orderId, { productId, sku }, { qty: 1 });

        // Transition to Canceled
        await update('order')
            .given({ payment_status: 'canceled' })
            .where('order_id', '=', orderId)
            .execute(pool);

        // Check Stock: Should still be 10 (as it was never deducted)
        const inv = await select().from('product_inventory').where('product_inventory_product_id', '=', productId).load(pool);
        expect(inv.qty).toBe(10);
    });

    test('Cancel Authorized (Deterministic Check)', async () => {
        const { productId: pId, sku: pSku } = await factory.createProduct({ qty: 10 });
        const { orderId } = await factory.createOrder({
            payment_status: 'authorized',
            status: 'authorized'
        });

        await factory.addOrderItem(orderId, { productId: pId, sku: pSku }, { qty: 2 });

        await update('order').given({ status: 'canceled', payment_status: 'canceled' }).where('order_id', '=', orderId).execute(pool);

        const finalInv = await select().from('product_inventory').where('product_inventory_product_id', '=', pId).load(pool);
        expect(finalInv.qty).toBe(10);
    });
});
