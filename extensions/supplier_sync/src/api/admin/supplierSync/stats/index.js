import {
    select,
    getConnection
} from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
    OK,
    INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async function (request, response) {
    let connection;
    try {
        connection = await getConnection(pool);
        const setting = await select()
            .from('setting')
            .where('name', '=', 'supplier_sync_stats')
            .execute(connection, false);

        const stats = setting && setting[0] ? JSON.parse(setting[0].value) : null;

        response.status(OK);
        response.json({
            data: stats || { lastRun: null, status: 'never_run' }
        });
    } catch (e) {
        response.status(INTERNAL_SERVER_ERROR);
        response.json({
            error: {
                status: INTERNAL_SERVER_ERROR,
                message: e.message
            }
        });
    } finally {
        // CRITICAL: Release connection to prevent pool exhaustion
        if (connection) {
            connection.release();
        }
    }
}
