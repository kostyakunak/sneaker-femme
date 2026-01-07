import {
    execute,
    select,
    getConnection,
    insert,
    update,
    startTransaction,
    commit,
    rollback
} from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/src/lib/postgres/connection'; // Direct import to ensure we get the instance? Or via alias. Trying relative fallback if alias fails at build time, but alias is safer for extension.
// Actually, package.json alias is "@evershop/evershop/lib/postgres".
// Let's use that.
// Wait, TS might complain if types aren't perfect in dev, but runtime is key.
// "import { pool } from '@evershop/evershop/lib/postgres';"
import { updatePaymentStatus } from '@evershop/evershop/src/modules/oms/services/updatePaymentStatus'; // Using src path to avoid types issues? No, use the package export.
// Actually, since I'm in the monorepo, I can import from packages directly if I want to be safe in dev.
// ../../../packages/evershop/src/modules/oms/services/updatePaymentStatus
// But cleaner is @evershop/evershop/...
// Let's try to stick to relative imports if I can't guarantee the build step happening before run.
// Since this is "evershop-dev", it's likely using direct source.
// I will use relative imports to avoid "module not found" if "dist" is not built.
// Path from extensions/supplier_sync/src/services/ to packages/evershop/src/... is:
// ../../../../../packages/evershop/src/...
import { info, error } from '@evershop/evershop/src/lib/log/logger';
import cancelOrder from '@evershop/evershop/src/modules/oms/services/cancelOrder';

export async function supplierSyncAndConfirm() {
    const connection = await getConnection(pool);

    // Advisory lock: 888888
    const lock = await select().from('pg_try_advisory_lock(888888)').execute(connection);
    if (!lock[0].pg_try_advisory_lock) {
        info('Supplier sync already running, skipping');
        return;
    }

    try {
        info('Starting Supplier Sync & Confirmation Job...');

        // 1. Mock Supplier Update
        // In real world: fetch(API) -> update product_inventory
        info('Mocking Supplier Inventory Sync...');

        // 2. Fetch Authorized Orders (FIFO)
        const authorizedOrders = await select()
            .from('order')
            .where('payment_status', '=', 'authorized')
            // .and('shipment_status', '=', 'pending') // Optional check
            .orderBy('created_at', 'ASC')
            .execute(connection);

        info(`Found ${authorizedOrders.length} authorized orders to process.`);

        for (const order of authorizedOrders) {
            await processOrder(order);
        }

    } catch (e) {
        error('Error in supplierSyncAndConfirm', e);
    } finally {
        await execute(connection, 'SELECT pg_advisory_unlock(888888)');
    }
}

async function processOrder(order) {
    const connection = await getConnection(pool); // Get fresh connection/client from pool?
    // Note: getConnection returns a client. Ideally allow parallel checks, or use single connection?
    // Since we are locked, we can use one connection sequentially.
    // But `processOrder` modifies DB.

    try {
        await startTransaction(connection);

        // Fetch Items
        const items = await select()
            .from('order_item')
            .where('order_item_order_id', '=', order.order_id)
            .execute(connection);

        let canFulfill = true;

        // Check Stock
        for (const item of items) {
            // We check against `product_inventory` table.
            // Crucially, we assume the sync step updated this table.
            const inventory = await select()
                .from('product_inventory')
                .where('product_inventory_product_id', '=', item.product_id)
                .execute(connection);

            const qtyAvailable = inventory[0] ? inventory[0].qty : 0;
            if (qtyAvailable < item.qty) {
                canFulfill = false;
                break;
            }
        }

        if (canFulfill) {
            // CAPTURE
            // Mock capture logic
            info(`Capturing payment for Order #${order.order_number}`);

            // This function call triggers the DB trigger `reduce_product_stock_when_order_paid`
            await updatePaymentStatus(order.order_id, 'paid', connection);

            await insert('order_activity').given({
                order_activity_order_id: order.order_id,
                comment: 'Automated: Stock Confirmed & Payment Captured',
                customer_notified: 1
            }).execute(connection);

        } else {
            // VOID / CANCEL
            info(`Voiding/Canceling Order #${order.order_number} - Out of Stock`);

            // Mock void logic

            // Cancel (reason "Out of stock")
            // Since status is 'authorized' != 'paid', our modified `cancelOrder` will NOT restock.
            // But we pass connection. `cancelOrder` handles its own transaction?
            // `cancelOrder` calls `startTransaction(connection)`. 
            // If we are already in transaction, nested might fail depending on specific driver support.
            // Postgres supports SAVEPOINT. Does `@evershop/postgres-query-builder` support nested?
            // Looking at `cancelOrder.ts`: it calls `getConnection(pool)` internally!
            // So it uses a DIFFERENT connection?
            // If so, our lock on `product_inventory` (if we had one) wouldn't help.
            // But we rely on atomic update in `updatePaymentStatus` or `cancelOrder`.
            // Let's just call `cancelOrder` completely separately to avoid transaction nesting issues
            // because `cancelOrder` is self-contained.

            // We commit our check transaction (readonly mostly) or just rollback it?
            // Actually checking stock didn't modify anything.
            // So we can commit/rollback.
            // BUT `updatePaymentStatus` also takes `connection`.
            // Let's check `updatePaymentStatus` signature import.
            // It expects `connection`.

            // Reuse connection for `updatePaymentStatus`.
            // But for `cancelOrder`...
            // `cancelOrder` source: `const connection = await getConnection(pool);` inside.
            // It does NOT take connection as arg.
        }

        await commit(connection);

        // Execute cancel outside logic transaction if failing
        if (!canFulfill) {
            await cancelOrder(order.uuid, 'Out of stock (Supplier Sync)');
        }

    } catch (e) {
        await rollback(connection);
        error(`Failed to process order ${order.order_number}`, e);
    }
}
