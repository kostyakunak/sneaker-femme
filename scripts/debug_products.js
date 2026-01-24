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
        console.log('Checking first 5 products...');
        const products = await pool.query('SELECT * FROM product ORDER BY product_id DESC LIMIT 5');
        console.log('Products:', products.rows.map(p => ({
            id: p.product_id,
            sku: p.sku
        })));

        const pids = products.rows.map(p => p.product_id);
        if (pids.length > 0) {
            console.log('Checking product_description...');
            const desc = await pool.query('SELECT * FROM product_description WHERE product_description_product_id = ANY($1)', [pids]);
            console.log('Descriptions found:', desc.rows.length);
            console.log('Description entries:', desc.rows.map(d => ({ pid: d.product_description_product_id, name: d.name })));

            // Check for missing descriptions
            const foundPids = desc.rows.map(d => d.product_description_product_id);
            const missing = pids.filter(id => !foundPids.includes(id));
            if (missing.length > 0) {
                console.log('WARNING: Missing descriptions for product IDs:', missing);
            } else {
                console.log('All checked products have descriptions.');
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
