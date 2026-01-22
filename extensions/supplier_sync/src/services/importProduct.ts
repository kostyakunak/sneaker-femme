import createProduct from '../../../../packages/evershop/src/modules/catalog/services/product/createProduct.js';

/**
 * Service to import a product from supplier data.
 * @param {Object} supplierData 
 * @param {Object} localData { categoryId, price, enabled }
 */
export async function importProductTask(supplierData, localData) {
    const productData = {
        name: supplierData.name,
        sku: supplierData.sku, // Store SKU
        url_key: supplierData.name.toLowerCase().replace(/ /g, '-'),
        status: localData.enabled ? 1 : 0,
        price: localData.price,
        qty: 0, // Initial qty 0, will be synced by job
        manage_stock: 1,
        stock_availability: 0,
        visibility: 'catalog',
        description: supplierData.description,
        group_id: localData.categoryId,
        supplier_sku: supplierData.sku, // Critical link
        supplier_source: 'import',
        images: supplierData.images
    };

    // Use Evershop's native service
    return await createProduct(productData, {});
}
