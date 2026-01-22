import {
    OK,
    INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';
import supplierSyncAndConfirm from '../../../services/supplierSyncAndConfirm.js';

export default async function (request, response) {
    try {
        // Run the job asynchronously (don't wait for it to finish) or wait?
        // For manual trigger, waiting is better to see immediate result in UI.
        await supplierSyncAndConfirm();

        response.status(OK);
        response.json({
            data: {
                message: 'Sync Job completed successfully.'
            }
        });
    } catch (e) {
        response.status(INTERNAL_SERVER_ERROR);
        response.json({
            error: {
                status: INTERNAL_SERVER_ERROR,
                message: e.message
            }
        });
    }
}
