import { update } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';

export default async (request, response, next) => {
    const newOrder = response.$body?.data || {};
    if (newOrder.payment_method === 'test_payment') {
        // 1. Update order status to authorized
        await update('order')
            .given({ payment_status: 'authorized', status: 'processing' })
            .where('order_id', '=', newOrder.order_id)
            .execute(pool);

        // 2. Insert a mock transaction so the sync job can find it
        // Using raw query for simplicity and reliability
        await pool.query(
            `INSERT INTO payment_transaction (payment_transaction_order_id, transaction_id, payment_action, amount, created_at)
       VALUES ($1, $2, 'authorize', $3, NOW())`,
            [newOrder.order_id, `test-tx-${newOrder.uuid}`, newOrder.grand_total]
        );

        // 3. Update the response body to reflect the new status
        if (response.$body?.data) {
            response.$body.data.payment_status = 'authorized';
            response.$body.data.status = 'processing';
        }
    }
    next();
};
