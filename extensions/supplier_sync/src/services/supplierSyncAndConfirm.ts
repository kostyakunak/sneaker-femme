import {
    execute,
    select,
    getConnection,
    insert,
    startTransaction,
    commit,
    rollback
} from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { updatePaymentStatus, cancelOrder } from '@evershop/evershop/oms/services';
import { info, error } from '@evershop/evershop/lib/log';
// const info = console.log;
// const error = console.error;
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getSetting } from '@evershop/evershop/setting/services';

export async function supplierSyncAndConfirm(stripeClient = null) {
    let lockConn;
    try {
        lockConn = await getConnection(pool);
        // Advisory lock: 888888
        const lockRes = await execute(lockConn, 'SELECT pg_try_advisory_lock(888888) AS locked');
        if (!lockRes.rows[0].locked) {
            info('Supplier sync already running, skipping');
            if (lockConn && typeof lockConn.release === 'function') {
                lockConn.release();
            }
            return;
        }

        info('Starting Supplier Sync & Confirmation Job...');

        // Initialize Stripe
        let stripe = stripeClient;
        if (!stripe) {
            const stripeConfig = getConfig('system.stripe', {});
            let stripeSecretKey;
            if (stripeConfig.secretKey) {
                stripeSecretKey = stripeConfig.secretKey;
            } else {
                stripeSecretKey = await getSetting('stripeSecretKey', '');
            }

            if (!stripeSecretKey) {
                throw new Error('Stripe Secret Key not found in config or settings');
            }

            // Dynamic import to avoid load issues during testing or if package is missing
            const { default: stripePackage } = await import('stripe');
            stripe = new stripePackage(stripeSecretKey, {
                apiVersion: '2020-08-27'
            });
        }

        // 1. Mock Supplier Update
        info('Mocking Supplier Inventory Sync...');

        // 2. Fetch Authorized Orders (FIFO)
        const orders = await select()
            .from('order')
            .orderBy('created_at', 'ASC')
            .where('payment_status', '=', 'authorized')
            .execute(lockConn, false);

        info(`Found ${orders.length} authorized orders to process.`);

        for (const order of orders) {
            await processOrder(order, stripe);
        }

    } catch (e) {
        error(e);
    } finally {
        if (lockConn) {
            try {
                await execute(lockConn, 'SELECT pg_advisory_unlock(888888)');
            } catch (unlockError) {
                error(unlockError);
            }
            if (typeof lockConn.release === 'function') {
                lockConn.release();
            }
        }
    }
}

async function processOrder(order, stripe) {
    let connection;
    try {
        connection = await getConnection(pool);

        // 1. READ Data (No transaction or short read-locked)
        // Fetch Items
        const items = await select()
            .from('order_item')
            .where('order_item_order_id', '=', order.order_id)
            .execute(connection, false);

        // Fetch Transaction ID (Strict: latest authorize action)
        const transQuery = select().from('payment_transaction');
        transQuery.where('payment_transaction_order_id', '=', order.order_id)
            .and('transaction_type', '=', 'online')
            .and('payment_action', '=', 'authorize');

        transQuery.orderBy('created_at', 'DESC').limit(0, 1);
        const transactions = await transQuery.execute(connection, false);

        const paymentIntentId = transactions[0] ? transactions[0].transaction_id : null;
        if (!paymentIntentId) {
            throw new Error(`No payment transaction found for authorized order #${order.order_number}`);
        }

        // Check Stock
        let canFulfill = true;
        for (const item of items) {
            const inventory = await select()
                .from('product_inventory')
                .where('product_inventory_product_id', '=', item.product_id)
                .execute(connection, false);

            const qtyAvailable = inventory[0] ? inventory[0].qty : 0;
            if (qtyAvailable < item.qty) {
                canFulfill = false;
                break;
            }
        }

        // RELEASE connection before networking
        connection.release();
        connection = null;

        // 2. NETWORKING (Stripe)
        let success = false;
        if (canFulfill) {
            info(`Capturing payment for Order #${order.order_number} (PI: ${paymentIntentId})`);
            const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {}, {
                idempotencyKey: `capture-${order.uuid}`
            });
            if (paymentIntent.status === 'succeeded') {
                success = true;
            } else {
                throw new Error(`Stripe Capture failed. Status: ${paymentIntent.status}`);
            }
        } else {
            info(`Voiding/Canceling Order #${order.order_number} - Out of Stock (PI: ${paymentIntentId})`);
            await stripe.paymentIntents.cancel(paymentIntentId, {}, {
                idempotencyKey: `cancel-${order.uuid}`
            });
            success = true;
        }

        // 3. WRITE Data (Short transaction)
        if (success) {
            connection = await getConnection(pool);
            await startTransaction(connection);

            if (canFulfill) {
                // Update to PAID and PROCESSING (standard flow)
                await execute(
                    connection,
                    `UPDATE "order" SET 
                        payment_status = 'paid', 
                        status = 'processing', 
                        updated_at = NOW() 
                     WHERE order_id = ${order.order_id}`
                );

                await insert('order_activity').given({
                    order_activity_order_id: order.order_id,
                    comment: `Automated: Stock Confirmed & Payment Captured (Stripe PI: ${paymentIntentId}). Status: processing.`,
                    customer_notified: 1
                }).execute(connection, false);
            } else {
                // Update to CANCELED
                await execute(
                    connection,
                    `UPDATE "order" SET 
                        status = 'canceled', 
                        shipment_status = 'canceled', 
                        payment_status = 'canceled', 
                        updated_at = NOW() 
                     WHERE order_id = ${order.order_id}`
                );

                await insert('order_activity').given({
                    order_activity_order_id: order.order_id,
                    comment: `Order canceled Out of stock (Supplier Sync)`,
                    customer_notified: 0
                }).execute(connection, false);
            }

            await commit(connection);
            info(`Order #${order.order_number} processed successfully (${canFulfill ? 'Captured' : 'Canceled'}).`);
        }

    } catch (e) {
        if (connection) {
            try {
                // @ts-ignore
                if (connection.INTRANSACTION) {
                    await rollback(connection);
                }
            } catch (rbError) {
                error(rbError);
            }
        }
        error(e);
    } finally {
        if (connection && typeof connection.release === 'function') {
            try {
                // @ts-ignore
                if (connection._released !== true) {
                    connection.release();
                }
            } catch (e) {
                // Ignore double release Errors
            }
        }
    }
}
