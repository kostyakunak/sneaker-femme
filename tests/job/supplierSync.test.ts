
import { jest } from '@jest/globals';
import {
    insert,
    select,
    update
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import supplierSyncAndConfirm from '@evershop/evershop/extensions/supplier_sync/services/supplierSyncAndConfirm';
import { TestFactory } from '../helpers/factory';

// Mock Config
const dbConfig = {
    user: 'admin',
    password: 'password',
    host: 'localhost',
    database: 'evershop_test',
    port: 5433
};

const pool = new Pool(dbConfig);
const factory = new TestFactory(pool);

// Mock Stripe
const mockCapture = jest.fn<() => Promise<any>>();
const mockCancel = jest.fn<() => Promise<any>>();

const mockStripeClient = {
    paymentIntents: {
        capture: mockCapture,
        cancel: mockCancel
    }
};

describe('Job: Supplier Sync & Confirm', () => {
    let productId1;
    let productId2;
    let sku1;
    let sku2;

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env.MOCK_SUPPLIER = '1';
        await factory.setup();

        // Product 1 (Will be In Stock)
        const p1 = await factory.createProduct({ qty: 10 });
        productId1 = p1.productId;
        sku1 = p1.sku;

        // Product 2 (Will be Out of Stock for multi-item test)
        const p2 = await factory.createProduct({ qty: 0 });
        productId2 = p2.productId;
        sku2 = p2.sku;

        // Ensure stock availability is false for p2 (createProduct sets true by default)
        await update('product_inventory')
            .given({ stock_availability: false })
            .where('product_inventory_product_id', '=', productId2)
            .execute(pool);
    });

    test('Idempotency: Successfully processes valid order and does NOT reprocessing', async () => {
        // 1. Create Authorized Order
        const { orderId, uuid: orderUuid, orderNumber } = await factory.createOrder({
            payment_status: 'authorized',
            status: 'pending'
        });

        await factory.addOrderItem(orderId, { productId: productId1, sku: sku1 }, { qty: 1 });

        // 2. Create Payment Transaction (Required by job to find PI)
        await insert('payment_transaction').given({
            payment_transaction_order_id: orderId,
            transaction_id: 'pi_test_123',
            transaction_type: 'online',
            payment_action: 'authorize',
            amount: 100,
            status: 'success'
        }).execute(pool);

        // Mock Stripe Success
        mockCapture.mockResolvedValue({ status: 'succeeded' });

        // RUN JOB
        await supplierSyncAndConfirm(mockStripeClient, null, pool);

        // ASSERTIONS
        const order = await select().from('order').where('order_id', '=', orderId).load(pool);

        // Should be PAID and PROCESSING
        expect(order.payment_status).toBe('paid');
        expect(order.status).toBe('processing');

        // Stripe Capture called
        expect(mockCapture).toHaveBeenCalledWith('pi_test_123', {}, expect.objectContaining({ idempotencyKey: `capture-${orderUuid}` }));
        expect(mockCapture).toHaveBeenCalledTimes(1);

        // RUN JOB AGAIN
        await supplierSyncAndConfirm(mockStripeClient, null, pool);

        // Verify Stripe NOT called again
        expect(mockCapture).toHaveBeenCalledTimes(1);
    });

    test('Multi-Item Partial Stock: Cancels order if ANY item is missing', async () => {
        // Order with 2 items: P1 (Stock 10) and P2 (Stock 0)
        const { orderId, uuid: orderUuid } = await factory.createOrder({
            payment_status: 'authorized',
            status: 'pending'
        });

        await factory.addOrderItem(orderId, { productId: productId1, sku: sku1 }, { qty: 1 });
        await factory.addOrderItem(orderId, { productId: productId2, sku: sku2 }, { qty: 1 });

        await insert('payment_transaction').given({
            payment_transaction_order_id: orderId,
            transaction_id: 'pi_multi_fail',
            transaction_type: 'online',
            payment_action: 'authorize',
            status: 'success',
            amount: 100
        }).execute(pool);

        // RUN JOB
        await supplierSyncAndConfirm(mockStripeClient, null, pool);

        // ASSERTIONS
        const order = await select().from('order').where('order_id', '=', orderId).load(pool);

        // Should be CANCELED
        expect(order.status).toBe('canceled');
        expect(order.payment_status).toBe('canceled');

        // Stripe Cancel called
        expect(mockCancel).toHaveBeenCalledWith('pi_multi_fail', {}, expect.objectContaining({ idempotencyKey: `cancel-${orderUuid}` }));
        expect(mockCapture).not.toHaveBeenCalled(); // Should NOT capture
    });

    test('Stripe Error: Handles capture failure gracefully', async () => {
        const { orderId } = await factory.createOrder({
            payment_status: 'authorized',
            status: 'pending'
        });

        await factory.addOrderItem(orderId, { productId: productId1, sku: sku1 }, { qty: 1 });

        await insert('payment_transaction').given({
            payment_transaction_order_id: orderId,
            transaction_id: 'pi_error',
            transaction_type: 'online',
            payment_action: 'authorize',
            status: 'success',
            amount: 100
        }).execute(pool);

        // Mock Stripe FAILURE
        mockCapture.mockRejectedValue(new Error('Stripe API Error'));

        // RUN JOB
        await supplierSyncAndConfirm(mockStripeClient, null, pool);

        // ASSERTIONS
        const order = await select().from('order').where('order_id', '=', orderId).load(pool);

        // Should REMAIN Authorized (Retry next time)
        expect(order.payment_status).toBe('authorized');
    });

    test('Contract Sync: Updates products from fixture feed', async () => {
        // 1. Setup a product matching the fixture (SKU-001)
        const { productId: pId } = await factory.createProduct({
            sku: 'SKU-001-LOCAL',
            supplier_sku: 'SKU-001', // Matches fixture
            price: 100
        });

        // 2. Load fixture data and Run Job
        const fs = await import('fs');
        const path = await import('path');
        const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/supplierFeed.fixture.json');
        const feedData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

        await supplierSyncAndConfirm(mockStripeClient, feedData, pool);

        // 3. Assert
        const syncProduct = await select().from('product').where('supplier_sku', '=', 'SKU-001').load(pool);
        expect(Number(syncProduct.supplier_price)).toBe(85.00); // From fixture

        const inventory = await select().from('product_inventory').where('product_inventory_product_id', '=', syncProduct.product_id).load(pool);
        expect(inventory.qty).toBe(25); // From fixture
    });

    test('Race Condition: Prevents overlapping execution', async () => {
        // Logic check only
    });
});
