import { importProductTask } from '../../services/importProduct.js';
import { select } from '@evershop/postgres-query-builder';

export default async (request, response) => {
    try {
        const { sku, categoryId, price, enabled } = request.body;

        if (!sku) {
            response.status(400);
            return {
                success: false,
                message: 'SKU is required'
            };
        }

        // DEDUPLICATION: Check if product with this supplier_sku already exists
        const existingProduct = await select()
            .from('product')
            .where('supplier_sku', '=', sku)
            .load(request.locals.pool);

        if (existingProduct) {
            response.status(409);
            return {
                success: false,
                message: `Product with supplier SKU "${sku}" already exists`,
                existingProduct: {
                    id: existingProduct.product_id,
                    uuid: existingProduct.uuid,
                    name: existingProduct.name,
                    editUrl: `/admin/products/${existingProduct.uuid}`
                }
            };
        }

        // Mock supplier data fetch (replace with real API call)
        const supplierData = {
            sku: sku,
            name: `Product ${sku}`,
            description: 'Imported from supplier',
            images: ['https://picsum.photos/400'],
            price: 99.99
        };

        const localData = {
            categoryId: categoryId || 1,
            price: price || supplierData.price,
            enabled: enabled !== false
        };

        // Import product using Evershop's createProduct service
        const product = await importProductTask(supplierData, localData);

        return {
            success: true,
            message: 'Product imported successfully',
            product: {
                id: product.insertId,
                name: supplierData.name,
                sku: supplierData.sku
            }
        };
    } catch (e) {
        response.status(500);
        return {
            success: false,
            message: e.message
        };
    }
};
