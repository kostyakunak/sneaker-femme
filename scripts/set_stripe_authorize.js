import dotenv from 'dotenv';
dotenv.config();
process.env.DB_SSLMODE = 'disable';
import { getConnection, select, insertOnUpdate, commit } from '@evershop/postgres-query-builder';

async function run() {
    const { pool } = await import('../packages/evershop/dist/lib/postgres/connection.js');

    try {
        console.log('🔌 Connected to DB');

        // Check current setting
        const current = await select()
            .from('setting')
            .where('name', '=', 'stripePaymentMode')
            .execute(await getConnection(pool));

        console.log('Current stripePaymentMode:', current[0]?.value);

        // Update or Insert 'authorize'
        await insertOnUpdate('setting', ['name'])
            .given({
                name: 'stripePaymentMode',
                value: 'authorizeOnly'
            })
            .execute(await getConnection(pool));

        // Verify
        const updated = await select()
            .from('setting')
            .where('name', '=', 'stripePaymentMode')
            .execute(await getConnection(pool));

        console.log('✅ Updated stripePaymentMode:', updated[0]?.value);
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
