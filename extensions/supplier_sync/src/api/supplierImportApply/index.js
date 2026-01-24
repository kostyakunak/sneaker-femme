/* eslint-disable camelcase */
import {
    getConnection,
    insert,
    startTransaction,
    commit,
    rollback,
    select
} from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
    OK
} from '@evershop/evershop/lib/util/httpStatus';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { v4 as uuidv4 } from 'uuid';

export default async function (request, response, next) {
    let connection;
    try {
        const {
            name,
            sku,
            price,
            description,
            images,
            qty,
            supplierSku,
            supplierSource,
            supplierPrice,
            category_id,
            status
        } = request.body;

        console.log(`[SupplierSync] Importing Product SKU: ${sku}, Supplier SKU: ${supplierSku}`);

        const shopCurrency = getConfig('shop.currency', 'USD');

        connection = await getConnection(pool);
        await startTransaction(connection);

        // Check if product with this supplier_sku OR sku already exists
        const exists = await select()
            .from('product')
            .where('supplier_sku', '=', supplierSku)
            .or('sku', '=', sku)
            .load(connection);

        if (exists) {
            console.log(`[SupplierSync] Product already exists: ${supplierSku} or ${sku}`);
            await rollback(connection);
            response.status(409);
            response.$body = {
                error: {
                    status: 409,
                    message: `Product with SKU "${sku}" or Supplier SKU "${supplierSku}" already exists`
                }
            };
            return next();
        }

        // 1. Create Product
        // Schema discovered via \d product:
        // Column: uuid, type, visibility, group_id, sku, price, weight, tax_class, status, category_id, ...
        const productData = {
            uuid: uuidv4(),
            sku: sku,
            price: parseFloat(price) || 0,
            weight: 1.0,
            status: parseInt(status, 10) === 1,
            type: 'simple',
            visibility: true,
            category_id: (category_id && category_id !== '') ? parseInt(category_id, 10) : null,
            supplier_sku: supplierSku,
            supplier_source: supplierSource || 'manual_import',
            supplier_price: parseFloat(supplierPrice) || 0,
            supplier_currency: shopCurrency,
            supplier_updated_at: new Date().toISOString()
        };
        const productRes = await insert('product').given(productData).execute(connection, false);
        const productId = productRes.insertId;

        // 2. Create Product Description
        await insert('product_description').given({
            product_description_product_id: productId,
            name: name,
            description: description || '',
            meta_title: name,
            meta_description: description ? description.substring(0, 160) : '',
            url_key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 1000)
        }).execute(connection, false);

        // 3. Create Inventory
        await insert('product_inventory').given({
            product_inventory_product_id: productId,
            qty: qty || 0,
            stock_availability: (qty > 0) ? 1 : 0,
            manage_stock: 1
        }).execute(connection, false);

        await commit(connection);
        console.log(`[SupplierSync] Import Success: ${productId}`);

        response.status(OK);
        response.$body = {
            data: {
                productId: productId,
                uuid: productData.uuid,
                message: 'Product imported successfully'
            }
        };
        next();
    } catch (e) {
        console.error(`[SupplierSync] Import Error: ${e.message}`);
        if (connection) {
            try {
                await rollback(connection);
            } catch (rbe) {
                console.error(rbe);
            }
        }
        next(e);
    }
}
