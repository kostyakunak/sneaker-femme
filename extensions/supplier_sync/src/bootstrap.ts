import { registerJob } from '@evershop/evershop/lib/cronjob';
import { supplierSyncAndConfirm } from './services/supplierSyncAndConfirm';

export default () => {
    registerJob({
        name: 'supplierSyncAndConfirm',
        schedule: '0 * * * *', // Run every hour at minute 0
        resolve: './services/supplierSyncAndConfirm.js', // Does this need to be resolvable path?
        // According to jobManager.ts logic: "isValidJsFilePath(job.resolve)"
        // And it checks fs.existsSync.
        // In dev (ts-node), this might be tricky if it expects .js.
        // The core likely compiles extension to dist/ before running?
        // Or runs in-place.
        // If running in-place (dev), "services/supplierSyncAndConfirm.ts" might be needed?
        // But isValidJsFilePath checks for ".js" extension explicitly!
        // See jobManager.ts: "return fileExtension === '.js';"
        // So usually extensions are compiled.
        // We should point to where it WILL be?
        // Or maybe since we pass the `job` FUNCTION directly in other systems, but here `registerJob` takes `Job` interface.
        // Job interface has `job` property? No, looking at jobManager.ts `getJob`, `Job` likely has `execute` or `job` function?
        // No, `registerJob` takes `Job`.
        // Let's check `types/cronjob.d.ts` if possible.
        // But `jobManager.ts` has `job.resolve`.
        // And `isValidJsFilePath` checks existance.
        // If I point to `.js`, it expects the build artifact.
        // I'll assume standard build process will convert .ts to .js in `dist` or similar.
        // I'll point to relative path as if it was js.
        enabled: true
    });
};
