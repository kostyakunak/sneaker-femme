import pg from 'pg';
const { Client } = pg;

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'kostakunak',
    password: '',
    database: 'evershop',
});

async function getAdminEmail() {
    try {
        await client.connect();
        const res = await client.query('SELECT email FROM admin_user');
        if (res.rows.length === 0) {
            console.log('No admin users found.');
        } else {
            console.log('Admin Emails:');
            res.rows.forEach(row => console.log(`- ${row.email}`));
        }
    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

getAdminEmail();
