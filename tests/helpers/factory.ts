
import {
    insert,
    select,
    execute,
    update
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory for creating test data in Evershop.
 * Uses template cloning to avoid maintenance of 30-40 NOT NULL fields.
 */
export class TestFactory {
    private pool: Pool;
    private templateOrderId: number | null = null;
    private templateCartId: number | null = null;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Resets the database and ensures template rows exist.
     */
    async setup() {
        await execute(this.pool, `
            TRUNCATE TABLE 
                "order", 
                "order_item", 
                "payment_transaction", 
                "order_activity", 
                "cart", 
                "cart_item", 
                "product", 
                "product_inventory", 
                "event" 
            RESTART IDENTITY CASCADE
        `);

        // Ensure supplier columns exist (Migration might not have run in test DB)
        await execute(this.pool, `
            ALTER TABLE "product" 
            ADD COLUMN IF NOT EXISTS "supplier_sku" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "supplier_price" DECIMAL(12,4),
            ADD COLUMN IF NOT EXISTS "supplier_currency" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "supplier_updated_at" TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "supplier_source" VARCHAR(255)
        `);

        // Create a "Gold Master" Cart
        const cartRes = await insert('cart').given({
            uuid: uuidv4(),
            currency: 'USD',
            status: true,
            total_qty: 0,
            sub_total: 0,
            sub_total_with_discount: 0,
            sub_total_incl_tax: 0,
            sub_total_with_discount_incl_tax: 0,
            tax_amount: 0,
            tax_amount_before_discount: 0,
            shipping_tax_amount: 0,
            grand_total: 0,
            total_tax_amount: 0
        }).execute(this.pool);
        this.templateCartId = cartRes.insertId;

        // Create a "Gold Master" Order
        const orderRes = await insert('order').given({
            uuid: uuidv4(),
            order_number: 'TEMPLATE-ORDER',
            status: 'pending',
            payment_status: 'pending',
            cart_id: this.templateCartId,
            currency: 'USD',
            sub_total: 0,
            sub_total_incl_tax: 0,
            sub_total_with_discount: 0,
            sub_total_with_discount_incl_tax: 0,
            total_qty: 0,
            tax_amount: 0,
            tax_amount_before_discount: 0,
            shipping_tax_amount: 0,
            grand_total: 0,
            total_tax_amount: 0
        }).execute(this.pool);
        this.templateOrderId = orderRes.insertId;
    }

    /**
     * Clones the template order and applies overrides.
     */
    async createOrder(overrides: Record<string, any> = {}) {
        if (!this.templateOrderId) await this.setup();

        const newUuid = uuidv4();
        const newOrderNumber = overrides.order_number || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 1. Clone Cart
        const cartRes = await execute(this.pool, `
            INSERT INTO cart (
                uuid, currency, status, total_qty, sub_total, sub_total_incl_tax, 
                sub_total_with_discount, sub_total_with_discount_incl_tax, 
                tax_amount, tax_amount_before_discount, shipping_tax_amount, grand_total, total_tax_amount
            )
            SELECT 
                $1, currency, status, total_qty, sub_total, sub_total_incl_tax, 
                sub_total_with_discount, sub_total_with_discount_incl_tax, 
                tax_amount, tax_amount_before_discount, shipping_tax_amount, grand_total, total_tax_amount
            FROM cart WHERE cart_id = $2
            RETURNING cart_id
        `, [uuidv4(), this.templateCartId]);
        const newCartId = cartRes.rows[0].cart_id;

        // 2. Clone Order
        const orderRes = await execute(this.pool, `
            INSERT INTO "order" (
                uuid, order_number, status, payment_status, cart_id, currency, 
                sub_total, sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax, 
                total_qty, tax_amount, tax_amount_before_discount, shipping_tax_amount, grand_total, total_tax_amount
            )
            SELECT 
                $1, $2, $3, $4, $5, currency, 
                sub_total, sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax, 
                total_qty, tax_amount, tax_amount_before_discount, shipping_tax_amount, grand_total, total_tax_amount
            FROM "order" WHERE order_id = $6
            RETURNING order_id
        `, [
            newUuid,
            newOrderNumber,
            overrides.status || 'pending',
            overrides.payment_status || 'pending',
            newCartId,
            this.templateOrderId
        ]);
        const orderId = orderRes.rows[0].order_id;

        // Apply overrides
        const remainingOverrides = { ...overrides };
        delete remainingOverrides.status;
        delete remainingOverrides.payment_status;
        delete remainingOverrides.order_number;

        if (Object.keys(remainingOverrides).length > 0) {
            await update('order').given(remainingOverrides).where('order_id', '=', orderId).execute(this.pool);
        }

        return { orderId, orderNumber: newOrderNumber, uuid: newUuid, cartId: newCartId };
    }

    /**
     * Creates a product with inventory.
     */
    async createProduct(overrides: Record<string, any> = {}) {
        const sku = overrides.sku || `SKU-${uuidv4().substring(0, 8)}`;
        const productRes = await insert('product').given({
            uuid: uuidv4(),
            status: true,
            type: 'simple',
            sku: sku,
            price: overrides.price || 100,
            supplier_sku: overrides.supplier_sku || null,
            supplier_price: overrides.supplier_price || null,
            supplier_currency: overrides.supplier_currency || null,
            supplier_source: overrides.supplier_source || null,
            ...overrides
        }).execute(this.pool);
        const productId = productRes.insertId;

        await insert('product_inventory').given({
            product_inventory_product_id: productId,
            qty: overrides.qty ?? 10,
            stock_availability: true,
            manage_stock: true
        }).execute(this.pool);

        return { productId, sku };
    }

    /**
     * Adds an item to an order.
     */
    async addOrderItem(orderId: number, product: { productId: number, sku: string }, overrides: Record<string, any> = {}) {
        await insert('order_item').given({
            order_item_order_id: orderId,
            product_id: product.productId,
            product_sku: product.sku,
            product_name: overrides.product_name || 'Test Product',
            qty: overrides.qty || 1,
            product_price: overrides.price || 100,
            final_price: overrides.price || 100,
            product_price_incl_tax: overrides.price || 100,
            final_price_incl_tax: overrides.price || 100,
            tax_percent: 0,
            tax_amount: 0,
            tax_amount_before_discount: 0,
            discount_amount: 0,
            line_total: (overrides.price || 100) * (overrides.qty || 1),
            line_total_with_discount: (overrides.price || 100) * (overrides.qty || 1),
            line_total_incl_tax: (overrides.price || 100) * (overrides.qty || 1),
            line_total_with_discount_incl_tax: (overrides.price || 100) * (overrides.qty || 1),
            discount_percent: 0,
            discount_amount_before_tax: 0,
            line_total_before_discount: (overrides.price || 100) * (overrides.qty || 1),
            line_total_incl_tax_before_discount: (overrides.price || 100) * (overrides.qty || 1),
            line_total_with_discount_before_tax: (overrides.price || 100) * (overrides.qty || 1),
            line_total_with_discount_incl_tax_before_tax: (overrides.price || 100) * (overrides.qty || 1),
            tax_total: 0,
            shipping_fee: 0,
            shipping_fee_incl_tax: 0,
            shipping_tax_amount: 0,
            product_weight: 0,
            total: (overrides.price || 100) * (overrides.qty || 1),
            total_incl_tax: (overrides.price || 100) * (overrides.qty || 1)
        }).execute(this.pool);
    }
}
