import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        console.log('Fixing "show_products" for Men category...');

        // Update IDs 3 (Men) to show_products = true
        const res = await pool.query(`
        UPDATE category 
        SET show_products = true 
        WHERE category_id IN (3)
        RETURNING *
    `);

        console.log('Updated rows:', res.rows.map(r => ({ id: r.category_id, show: r.show_products })));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
