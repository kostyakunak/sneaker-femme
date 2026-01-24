import {
    OK
} from '@evershop/evershop/lib/util/httpStatus';
import supplierSyncAndConfirm from '../../../services/supplierSyncAndConfirm.js';

export default async function (request, response, next) {
    try {
        await supplierSyncAndConfirm();

        response.status(OK);
        response.$body = {
            data: {
                message: 'Sync Job completed successfully.'
            }
        };
        next();
    } catch (e) {
        next(e);
    }
}
