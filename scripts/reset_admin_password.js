
import pg from 'pg';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const { Client } = pg;

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'kostakunak',
    password: '',
    database: 'evershop',
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const hashPassword = (password) => {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
};

const updatePassword = async (email, newPassword) => {
    try {
        await client.connect();

        // Check if user exists
        const userRes = await client.query('SELECT * FROM admin_user WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log(`User with email ${email} not found.`);
            return;
        }

        const hashedPassword = hashPassword(newPassword);

        await client.query('UPDATE admin_user SET password = $1 WHERE email = $2', [hashedPassword, email]);
        console.log(`✅ Password for ${email} has been successfully updated!`);

    } catch (err) {
        console.error('Error updating password:', err);
    } finally {
        await client.end();
        process.exit(0);
    }
};

rl.question('Enter Admin Email (default: kostyakunak@gmail.com): ', (email) => {
    const targetEmail = email.trim() || 'kostyakunak@gmail.com';

    rl.question('Enter New Password: ', (password) => {
        if (password.length < 6) {
            console.log('❌ Password must be at least 6 characters.');
            rl.close();
            process.exit(1);
        }
        updatePassword(targetEmail, password);
        rl.close();
    });
});
