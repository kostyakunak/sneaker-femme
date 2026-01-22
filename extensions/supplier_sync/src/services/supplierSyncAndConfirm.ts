
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import {
    select,
    update,
    execute
} from '@evershop/postgres-query-builder';

let info = (msg: any) => console.log(`[INFO] ${msg}`);
let error = (msg: any) => console.error(`[ERROR] ${msg}`);

import { tgSend } from './telegram.js';

const ADVISORY_LOCK_ID = 1768678606; // Unique ID for this job

/**
 * Job to sync products from a supplier feed (JSON) and confirm authorized orders.
 * Path: extensions/supplier_sync/src/services/supplierSyncAndConfirm.ts
 */
export default async function supplierSyncAndConfirm(stripeClient: any, initialFeed: any = null, externalConn: any = null) {
    let connection = externalConn;
    let releasedLocally = false;
    let locked = false;

    try {
        // Attempt to load standard Evershop logger
        try {
            // @ts-ignore
            const logger = await import('@evershop/evershop/src/lib/log/logger');
            if (logger.info) info = logger.info;
            if (logger.error) error = logger.error;
        } catch (e) {
            // Fallback to console loggers (already set)
        }

        info('Starting Supplier Sync & Confirmation Job...');

        if (!connection) {
            // @ts-ignore
            const { getPool } = await import('@evershop/evershop/src/lib/postgres/connection');
            connection = await getPool().connect();
            releasedLocally = true;
            // CRITICAL: Prevent query-builder from releasing connection after each execute()
            // @ts-ignore
            connection.INTRANSACTION = true;
        }

        // 0. Acquire Advisory Lock to prevent parallel execution
        await execute(connection, `SELECT pg_advisory_lock(${ADVISORY_LOCK_ID})`);
        locked = true;

        // 1. Sync Inventory from Feed
        const mockSupplier = process.env.MOCK_SUPPLIER === '1';
        await syncSupplierInventory(connection, initialFeed, mockSupplier);

        // 2. Process Authorized Orders
        await processAuthorizedOrders(connection, stripeClient);

    } catch (e) {
        error(e);
    } finally {
        if (connection) {
            if (locked) {
                await execute(connection, `SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
            }
            if (releasedLocally) {
                // @ts-ignore
                connection.INTRANSACTION = false;
                connection.release();
            }
        }
    }
}

async function syncSupplierInventory(connection: any, initialFeed: any, mockSupplier: boolean = false) {
    let successCount = 0;
    let feed = initialFeed;

    if (!feed) {
        try {
            const currentDir = path.dirname(fileURLToPath(import.meta.url));
            const fixturePath = path.resolve(currentDir, '../../../../tests/fixtures/supplierFeed.fixture.json');

            if (existsSync(fixturePath)) {
                info(`Loading feed from ${fixturePath}`);
                feed = JSON.parse(readFileSync(fixturePath, 'utf8'));
            } else {
                const altPath = path.resolve(process.cwd(), 'tests/fixtures/supplierFeed.fixture.json');
                if (existsSync(altPath)) {
                    info(`Loading feed from ${altPath} (fallback)`);
                    feed = JSON.parse(readFileSync(altPath, 'utf8'));
                }
            }
        } catch (e) {
            info(`Error loading feed: ${(e as Error).message}`);
        }
    }

    // Use raw query to avoid builder issues with IS NOT NULL
    const res = await execute(connection, 'SELECT * FROM product WHERE supplier_sku IS NOT NULL');
    const products = res.rows || [];

    for (const p of products) {
        let supplierPrice;
        let qty;

        // @ts-ignore
        const feedItem = feed ? feed.find((f: any) => f.sku === p.supplier_sku) : null;
        if (feedItem) {
            supplierPrice = feedItem.price;
            qty = feedItem.qty;
        } else if (mockSupplier) {
            supplierPrice = p.price ? (parseFloat(p.price as string) * 0.8).toFixed(2) : 10.00;
            qty = Math.floor(Math.random() * 50);
        } else {
            continue;
        }

        // Update Inventory
        await update('product_inventory')
            .given({
                qty: qty,
                stock_availability: qty > 0
            })
            .where('product_inventory_product_id', '=', p.product_id)
            .execute(connection);

        // Update Product Supplier Info
        await update('product')
            .given({
                supplier_price: supplierPrice,
                supplier_updated_at: new Date(),
                supplier_source: mockSupplier ? 'mock' : 'fixture'
            })
            .where('product_id', '=', p.product_id)
            .execute(connection);

        successCount++;
    }

    return successCount;
}

async function processAuthorizedOrders(connection: any, stripeClient: any) {
    const ordersRes = await select().from('order')
        .where('payment_status', '=', 'authorized')
        .execute(connection);

    const orders = ordersRes || [];

    // Skip orders already in processing_lock states (idempotency protection)
    const processingOrders = orders.filter(o =>
        o.payment_status !== 'capturing' && o.payment_status !== 'voiding'
    );

    if (processingOrders.length > 0) {
        if (!stripeClient) {
            info(`Skipping ${processingOrders.length} authorized orders - Stripe not configured`);
            return;
        }
        info(`Processing ${processingOrders.length} authorized orders...`);
    }

    const simMode = process.env.SUPPLIER_SIM_MODE;
    const simSuccessRate = Number(process.env.SUPPLIER_SIM_SUCCESS_RATE || '0.7');

    for (const order of processingOrders) {
        try {
            // Simulation Logic
            let forceFail = false;
            if (simMode === 'random') {
                forceFail = Math.random() > simSuccessRate;
                if (forceFail) {
                    info(`Simulating FAIL for order ${order.order_number} (random mode)`);
                }
            }
            // Check all items in stock
            const items = await select().from('order_item')
                .where('order_item_order_id', '=', order.order_id)
                .execute(connection);

            let allInStock = true;
            for (const item of items) {
                const invRes = await select().from('product_inventory')
                    .where('product_inventory_product_id', '=', item.product_id)
                    .execute(connection);
                const inv = invRes[0];

                if (!inv || Number(inv.qty) < Number(item.qty)) {
                    info(`Item ${item.product_sku || 'unknown'} out of stock for order ${order.order_number}`);
                    allInStock = false;
                    break;
                }
            }

            // Apply simulation fail if needed
            if (forceFail) {
                allInStock = false;
            }

            // Find Transaction ID (Avoid non-existent 'status' column)
            const txQuery = select().from('payment_transaction');
            txQuery.where('payment_transaction_order_id', '=', order.order_id);
            txQuery.andWhere('payment_action', '=', 'authorize');
            const txRes = await txQuery.execute(connection);
            const tx = txRes[0];

            if (allInStock && tx) {
                info(`Capturing order ${order.order_number}`);

                // IDEMPOTENCY: Set processing_lock BEFORE Stripe call
                await update('order')
                    .given({ payment_status: 'capturing' })
                    .where('order_id', '=', order.order_id)
                    .execute(connection);

                try {
                    // @ts-ignore
                    await stripeClient.paymentIntents.capture(tx.transaction_id, {}, { idempotencyKey: `capture-${order.uuid}` });

                    await update('order')
                        .given({ status: 'processing', payment_status: 'paid' })
                        .where('order_id', '=', order.order_id)
                        .execute(connection);

                    // AUDIT TRAIL: Log successful capture
                    await execute(connection,
                        `INSERT INTO order_activity (order_activity_order_id, comment, customer_notified, created_at) 
                         VALUES ($1, $2, false, NOW())`,
                        [order.order_id, 'Order captured via supplier sync']
                    );

                    // TELEGRAM NOTIFICATION
                    await tgSend(
                        `✅ <b>ORDER CONFIRMED</b>\n` +
                        `Order #${order.order_number}\n` +
                        `Total: ${order.grand_total} ${order.currency}\n` +
                        `Items:\n${items.map(i => `• ${i.product_sku} x${i.qty}`).join("\n")}\n\n` +
                        `Supplier action: DEDUCT STOCK`
                    );
                } catch (stripeError) {
                    // AUDIT TRAIL: Log Stripe failure
                    await execute(connection,
                        `INSERT INTO order_activity (order_activity_order_id, comment, customer_notified, created_at) 
                         VALUES ($1, $2, false, NOW())`,
                        [order.order_id, `Payment capture failed: ${(stripeError as Error).message}`]
                    );

                    // TELEGRAM NOTIFICATION (Error)
                    await tgSend(
                        `⚠️ <b>ORDER RETRY</b>\n` +
                        `Order #${order.order_number}\n` +
                        `Stripe/Error: ${String((stripeError as Error).message || stripeError)}`
                    );
                    // Revert to authorized state for retry on next job run
                    await update('order')
                        .given({ payment_status: 'authorized' })
                        .where('order_id', '=', order.order_id)
                        .execute(connection);
                    // Don't throw - allow job to continue processing other orders
                }
            } else if (!allInStock && tx) {
                // Find out-of-stock item for audit trail
                let outOfStockSku = 'unknown';
                for (const item of items) {
                    const invRes = await select().from('product_inventory')
                        .where('product_inventory_product_id', '=', item.product_id)
                        .execute(connection);
                    const inv = invRes[0];
                    if (!inv || Number(inv.qty) < Number(item.qty)) {
                        outOfStockSku = item.product_sku || 'unknown';
                        break;
                    }
                }

                info(`Canceling order ${order.order_number} due to stock issues`);

                // IDEMPOTENCY: Set processing_lock BEFORE Stripe call
                await update('order')
                    .given({ payment_status: 'voiding' })
                    .where('order_id', '=', order.order_id)
                    .execute(connection);

                try {
                    // @ts-ignore
                    await stripeClient.paymentIntents.cancel(tx.transaction_id, {}, { idempotencyKey: `cancel-${order.uuid}` });

                    await update('order')
                        .given({ status: 'canceled', payment_status: 'canceled' })
                        .where('order_id', '=', order.order_id)
                        .execute(connection);

                    // AUDIT TRAIL: Log cancellation with reason
                    await execute(connection,
                        `INSERT INTO order_activity (order_activity_order_id, comment, customer_notified, created_at) 
                         VALUES ($1, $2, false, NOW())`,
                        [order.order_id, `Canceled: Item ${outOfStockSku} out of stock`]
                    );

                    // TELEGRAM NOTIFICATION (Fail)
                    await tgSend(
                        `❌ <b>ORDER CANCELED (OOS/SIM)</b>\n` +
                        `Order #${order.order_number}\n` +
                        `Reason: ${forceFail ? 'Simulation Fail' : 'Out of stock'}\n` +
                        `Items:\n${items.map(i => `• ${i.product_sku} x${i.qty}`).join("\n")}\n\n` +
                        `Supplier action: NO DEDUCT`
                    );
                } catch (stripeError) {
                    // AUDIT TRAIL: Log void failure
                    await execute(connection,
                        `INSERT INTO order_activity (order_activity_order_id, comment, customer_notified, created_at) 
                         VALUES ($1, $2, false, NOW())`,
                        [order.order_id, `Payment void failed: ${(stripeError as Error).message}`]
                    );
                    // Revert to authorized state for retry on next job run
                    await update('order')
                        .given({ payment_status: 'authorized' })
                        .where('order_id', '=', order.order_id)
                        .execute(connection);
                    // Don't throw - allow job to continue processing other orders
                }
            } else {
                // If tx is missing but order is authorized, it might be an inconsistent state or manual change
                info(`Skipping order ${order.order_number}: InStock=${allInStock}, TxFound=${!!tx}`);
            }
        } catch (e) {
            error(`Failed to process order ${order.order_number}: ${(e as Error).message}`);
        }
    }
}
