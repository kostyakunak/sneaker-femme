import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';

// Simple camelCase implementation mimicking the likely behavior of the project's utility
function toCamelCase(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);

    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            newObj[newKey] = obj[key];
        }
    }
    return newObj;
}

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
        console.log('--- STARTING SIMULATION ---');
        console.log('Fetching Product ID 41 (nike-2)...');

        const query = `
        SELECT 
            p.*, 
            pi.qty, pi.manage_stock, pi.stock_availability,
            pd.name as name, pd.description as description
        FROM product p
        LEFT JOIN product_inventory pi ON p.product_id = pi.product_inventory_product_id
        LEFT JOIN product_description pd ON p.product_id = pd.product_description_product_id
        WHERE p.product_id = 41
    `;

        const productsRes = await pool.query(query);
        console.log(`Found ${productsRes.rows.length} products in DB.`);

        if (productsRes.rows.length === 0) {
            console.log('Product 41 not found.');
            return;
        }

        // 3. Simulate Resolvers
        console.log('--- SIMULATING RESOLVERS ---');

        for (const rawRow of productsRes.rows) {
            const product = toCamelCase(rawRow);
            console.log(`\nChecking Product ID: ${product.productId} (SKU: ${product.sku})`);

            // Simulating Status Resolver
            // product.status === true || product.status === 1 ? 1 : 0;
            const statusResolved = product.status === true || product.status === 1 ? 1 : 0;
            console.log(`Resolver "status": DB Value=${rawRow.status} (${typeof rawRow.status}) -> Resolved=${statusResolved} (Expected Int: ${Number.isInteger(statusResolved)})`);
            if (!Number.isInteger(statusResolved)) console.error('FAIL: Status is not an integer');

            // Simulating Weight Resolver
            // product.weight || 0
            const weightResolved = product.weight || 0;
            console.log(`Resolver "weight": DB Value=${rawRow.weight} (${typeof rawRow.weight}) -> Resolved=${weightResolved} (Expected to be fed to Weight scalar)`);

            // Check Weight Type compliance
            const weightValue = parseFloat(weightResolved);
            if (isNaN(weightValue)) console.error('FAIL: Weight is not parseable to Float');
            else console.log(`  -> Weight.value resolver would behave as: ${weightValue}`);

            // Simulating Inventory Resolvers
            // stockAvailability: product.stockAvailability === true ? 1 : 0
            const stockVerification = rawRow.stock_availability === true ? 1 : 0;
            console.log(`Resolver "inventory.stockAvailability": DB Value=${rawRow.stock_availability} -> Resolved=${stockVerification}`);

            const manageStockVerification = rawRow.manage_stock === true ? 1 : 0;
            console.log(`Resolver "inventory.manageStock": DB Value=${rawRow.manage_stock} -> Resolved=${manageStockVerification}`);

            // isInStock resolver
            const qty = parseInt(rawRow.qty, 10);
            const isInStock = (qty > 0 && rawRow.stock_availability === true) || rawRow.manage_stock === false;
            console.log(`Resolver "inventory.isInStock": DB Value IsInStock calculated -> ${isInStock} (Boolean)`);

            // Simulating Price
            console.log(`Resolver "price": DB Value=${rawRow.price}`);

            // Simulating Visibility
            console.log(`Resolver "visibility": DB Value=${rawRow.visibility} -> Resolved=${rawRow.visibility === true || rawRow.visibility === 1 ? 1 : 0}`);

            // Check Description
            console.log(`Description present: ${!!product.description}`);

            // Check Name
            console.log(`Name present: ${!!product.name}`);
            if (!product.name) console.error('FAIL: Name is missing!');

            // Check UUID
            console.log(`UUID present: ${!!product.uuid}`);
            if (!product.uuid) console.error('FAIL: UUID is missing!');
        }

        console.log('\n--- SIMULATION COMPLETE ---');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
