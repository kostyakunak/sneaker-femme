import {
    select,
    getConnection
} from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
    OK
} from '@evershop/evershop/lib/util/httpStatus';

export default async function (request, response, next) {
    let connection;
    try {
        connection = await getConnection(pool);
        const setting = await select()
            .from('setting')
            .where('name', '=', 'supplier_sync_stats')
            .execute(connection, false);

        const stats = setting && setting[0] ? JSON.parse(setting[0].value) : null;

        response.status(OK);
        response.$body = {
            data: stats || { lastRun: null, status: 'never_run' }
        };
        next();
    } catch (e) {
        next(e);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
