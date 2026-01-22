import supplierSyncAndConfirm from '../../services/supplierSyncAndConfirm.js';
import { getConfig } from '@evershop/evershop/src/lib/util/getConfig';

export default async (request, response) => {
    try {
        // Load Stripe client from config (if configured)
        let stripeClient = null;
        try {
            const stripeConfig = getConfig('system.stripe', {});
            if (stripeConfig.secretKey) {
                const Stripe = (await import('stripe')).default;
                stripeClient = new Stripe(stripeConfig.secretKey, {
                    apiVersion: stripeConfig.apiVersion || '2023-10-16'
                });
            }
        } catch (e) {
            // Stripe not configured - job will skip order confirmation
            console.warn('Stripe not configured, order confirmation will be skipped');
        }

        // Trigger the job
        await supplierSyncAndConfirm(stripeClient, null, null);

        return {
            success: true,
            message: 'Supplier Sync triggered successfully'
        };
    } catch (e) {
        response.status(500);
        return {
            success: false,
            message: e.message
        };
    }
};
