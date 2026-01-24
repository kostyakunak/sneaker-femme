import {
    OK,
    INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async function (request, response, next) {
    try {
        const { sku, url } = request.body;
        console.log(`[SupplierSync] Fetching SKU: ${sku || url}`);

        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay

        const input = (sku || url || 'SUPPLIER-SKU-001').trim();

        let qty = 50;
        if (input.toUpperCase().includes('OOS')) qty = 0;      // Out of stock
        if (input.toUpperCase().includes('LOW')) qty = 1;      // Low stock

        const supplierPrice = 29.99;

        const mockProduct = {
            sku: input,
            name: `Imported Product ${input}`,
            description: `Mock supplier description for ${input}`,
            price: (supplierPrice * 2).toFixed(2),
            images: [
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80'
            ],
            supplierPrice: supplierPrice.toFixed(2),
            qty,
            attributes: [
                { attribute_code: 'size', value_text: '42' },
                { attribute_code: 'color', value_text: 'Black' }
            ]
        };

        console.log(`[SupplierSync] Returning mock data for: ${input}`);

        // standard Evershop way to handle API response:
        // Set the body and status, BUT DONT SEND. 
        // Let the [apiResponse] middleware handle it.
        response.status(OK);
        response.$body = {
            data: mockProduct
        };
        next();
    } catch (e) {
        console.error(`[SupplierSync] Fetch Error: ${e.message}`);
        next(e);
    }
}
