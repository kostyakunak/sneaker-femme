import { useCheckout, useCheckoutDispatch } from '@components/frontStore/checkout/CheckoutContext.js';
import React, { useEffect } from 'react';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

export default function TestPayment() {
    const { registerPaymentComponent } = useCheckoutDispatch();

    useEffect(() => {
        registerPaymentComponent('test_payment', {
            nameRenderer: () => (
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Test Payment (Authorize Only)</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Dev Only</span>
                </div>
            ),
            formRenderer: () => (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm text-gray-600 italic">
                        {_('This method simulates an "Authorized" payment status. No real payment will be processed. Perfect for testing the order fulfillment job and Telegram notifications.')}
                    </p>
                </div>
            ),
            checkoutButtonRenderer: () => {
                const { checkout } = useCheckoutDispatch();
                const { loadingStates, orderPlaced } = useCheckout();

                const handleClick = async (e) => {
                    e.preventDefault();
                    await checkout();
                };

                const isDisabled = loadingStates.placingOrder || orderPlaced;

                return (
                    <button
                        type="button"
                        onClick={handleClick}
                        disabled={isDisabled}
                        className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg font-semibold text-lg shadow hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loadingStates.placingOrder ? _('Placing Order...') : orderPlaced ? _('Order Placed') : _('Place Order (Test)')}
                    </button>
                );
            }
        });
    }, [registerPaymentComponent]);

    return null;
}

export const layout = {
    areaId: 'checkoutForm',
    sortOrder: 20
};
