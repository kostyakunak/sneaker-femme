import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');
const MEDIA_PATH = path.join(ROOT_PATH, 'media');

// Config from env (matching docker-compose or .env)
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "minioadmin",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "minioadmin",
    },
});

const bucketName = process.env.AWS_BUCKET_NAME || "evershop-media";

async function walk(dir) {
    let files = await fs.readdir(dir, { withFileTypes: true });
    files = await Promise.all(files.map(async (file) => {
        const res = path.resolve(dir, file.name);
        return file.isDirectory() ? walk(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function migrate() {
    console.log(`🚀 Starting migration from ${MEDIA_PATH} to S3 bucket: ${bucketName}...`);

    try {
        const files = await walk(MEDIA_PATH);
        console.log(`Found ${files.length} files to migrate.`);

        for (const filePath of files) {
            const relativePath = path.relative(MEDIA_PATH, filePath).replace(/\\/g, '/');
            const fileContent = await fs.readFile(filePath);

            console.log(`Uploading ${relativePath}...`);

            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: relativePath,
                Body: fileContent,
                // Simple content type mapping
                ContentType: getContentType(relativePath)
            }));
        }

        console.log('✅ Migration completed successfully!');
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`❌ Media directory ${MEDIA_PATH} not found.`);
        } else {
            console.error('❌ Migration failed:', err);
        }
        process.exit(1);
    }
}

function getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    };
    return map[ext] || 'application/octet-stream';
}

migrate();
