import { supplierSyncAndConfirm } from '../../../../../../../extensions/supplier_sync/src/services/supplierSyncAndConfirm.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response) => {
    try {
        // Run the sync job
        await supplierSyncAndConfirm();
        response.status(OK).json({
            status: 'success',
            message: 'Supplier sync completed successfully'
        });
    } catch (error) {
        response.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
