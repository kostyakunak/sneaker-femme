import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethods.js';

export default async () => {
    registerPaymentMethod({
        init: async () => ({
            code: 'test_payment',
            name: 'Test Payment (Authorize)'
        }),
        validator: async () => {
            return true; // Always available in development/test
        }
    });
};
