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
        console.log('Checking "category" table columns...');
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'category'");
        console.log('Category Columns:', res.rows.map(r => `${r.column_name} (${r.data_type})`));

        // Check Men category
        const cat = await pool.query(`
        SELECT c.*, cd.name 
        FROM category c 
        JOIN category_description cd ON c.category_id = cd.category_description_category_id 
        WHERE cd.name ILIKE '%Men%' OR cd.name ILIKE '%Чоловіче%'
        LIMIT 1
    `);

        if (cat.rows.length > 0) {
            console.log('Men Category:', cat.rows[0]);
        } else {
            console.log('Men Category not found');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
