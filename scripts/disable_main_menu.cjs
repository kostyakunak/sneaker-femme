const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'kostakunak',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'evershop',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        console.log('Disabling "Main menu" widget (ID 1)...');

        const res = await pool.query(
            `UPDATE widget SET status = false WHERE widget_id = 1 RETURNING *`
        );

        if (res.rows.length > 0) {
            console.log('Widget disabled:', res.rows[0]);
        } else {
            console.log('Widget ID 1 not found or already disabled (check logic if needed).');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
