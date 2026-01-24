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
        console.log('Fetching category hierarchy...\n');

        // Get all categories with their parent relationships
        const res = await pool.query(`
      SELECT 
        c.category_id,
        c.parent_id,
        cd.name,
        c.status,
        c.include_in_nav
      FROM category c
      LEFT JOIN category_description cd ON c.category_id = cd.category_description_category_id
      ORDER BY c.parent_id NULLS FIRST, c.category_id
    `);

        console.log('All categories:');
        res.rows.forEach(cat => {
            const indent = cat.parent_id ? '  → ' : '';
            console.log(`${indent}ID: ${cat.category_id}, Parent: ${cat.parent_id || 'ROOT'}, Name: "${cat.name}", Status: ${cat.status}, InNav: ${cat.include_in_nav}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
