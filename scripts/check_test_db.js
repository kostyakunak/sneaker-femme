import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'admin',
    password: 'password',
    host: 'localhost',
    database: 'evershop_test',
    port: 5433,
    connectionTimeoutMillis: 5000
});

async function check() {
    console.log('Attempting to connect to evershop_test on localhost:5433...');
    try {
        const client = await pool.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Result:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await pool.end();
    }
}

check();
