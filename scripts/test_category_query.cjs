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
        console.log('Testing GraphQL categories query simulation...\n');

        // Simulate the GraphQL query: get root categories with include_in_nav = true
        const rootCats = await pool.query(`
      SELECT 
        c.category_id,
        c.uuid,
        cd.name,
        cd.url_key
      FROM category c
      LEFT JOIN category_description cd ON c.category_id = cd.category_description_category_id
      WHERE c.parent_id IS NULL 
        AND c.include_in_nav = true
        AND c.status = true
      ORDER BY c.category_id
    `);

        console.log('Root categories (should be Жіноче взуття, Чоловіче взуття):');
        console.log(rootCats.rows);

        // For each root category, get children
        for (const root of rootCats.rows) {
            const children = await pool.query(`
        SELECT 
          c.category_id,
          c.uuid,
          cd.name,
          cd.url_key
        FROM category c
        LEFT JOIN category_description cd ON c.category_id = cd.category_description_category_id
        WHERE c.parent_id = $1
          AND c.status = true
        ORDER BY c.category_id
      `, [root.category_id]);

            console.log(`\nChildren of "${root.name}" (ID ${root.category_id}):`);
            console.log(children.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
