import {
    OK,
    INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async function (request, response) {
    try {
        const { sku, url } = request.body;
        // MOCK SUPPLIER FETCH
        // In real life, we would call axios.get(url) or supplier API with SKU

        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay

        const mockProduct = {
            sku: sku || 'SUPPLIER-SKU-001',
            name: `Imported Product ${sku || 'Unknown'}`,
            description: 'This is a product description fetched from the supplier. It contains details about material, size, and care instructions.',
            price: (Math.random() * 100 + 10).toFixed(2),
            images: [
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            ],
            supplierPrice: (Math.random() * 50 + 5).toFixed(2),
            qty: 50,
            attributes: [
                { attribute_code: 'size', value_text: 'M' },
                { attribute_code: 'color', value_text: 'Red' }
            ]
        };

        response.status(OK);
        response.json({
            data: mockProduct
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
