import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import https from 'https';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const RAILWAY_URL = 'https://sneaker-femme-production.up.railway.app';
const LOCAL_MEDIA_DIR = path.join(__dirname, '..', 'media');

// Database connection
const pool = new Pool({
    host: 'localhost',
    database: 'evershop',
    user: 'kostakunak',
    port: 5432
});

async function downloadImage(url, localPath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const dir = path.dirname(localPath);
                fsp.mkdir(dir, { recursive: true })
                    .then(() => {
                        const fileStream = fs.createWriteStream(localPath);
                        response.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            console.log(`✓ Downloaded: ${path.basename(localPath)}`);
                            resolve();
                        });
                        fileStream.on('error', reject);
                    })
                    .catch(reject);
            } else if (response.statusCode === 404) {
                console.log(`✗ Not found (404): ${path.basename(url)}`);
                resolve(); // Don't fail on 404
            } else {
                console.log(`✗ HTTP ${response.statusCode}: ${path.basename(url)}`);
                resolve(); // Don't fail on other errors
            }
        }).on('error', (err) => {
            console.error(`✗ Network error: ${path.basename(url)} - ${err.message}`);
            resolve(); // Don't fail on network errors
        });
    });
}

async function main() {
    try {
        console.log('🔍 Fetching image paths from database...');
        const result = await pool.query('SELECT DISTINCT origin_image FROM product_image WHERE origin_image IS NOT NULL');

        console.log(`📦 Found ${result.rows.length} unique images to download\n`);

        let downloaded = 0;

        for (const row of result.rows) {
            const imagePath = row.origin_image;
            // Convert /assets/catalog/... to media/catalog/...
            const localPath = imagePath.replace('/assets/', '');
            const fullLocalPath = path.join(LOCAL_MEDIA_DIR, localPath);
            const remoteUrl = `${RAILWAY_URL}${imagePath}`;

            await downloadImage(remoteUrl, fullLocalPath);
            downloaded++;
        }

        console.log(`\n✅ Download process complete!`);
        console.log(`   Processed: ${downloaded} images`);

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
}

main();
