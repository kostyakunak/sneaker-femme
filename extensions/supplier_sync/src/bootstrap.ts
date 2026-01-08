import { registerJob } from '@evershop/evershop/lib/cronjob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => {
    registerJob({
        name: 'supplierSyncAndConfirm',
        schedule: '0 * * * *', // Run every hour at minute 0
        resolve: path.resolve(__dirname, 'services/supplierSyncAndConfirm.js'),
        enabled: true
    });
};
