
import { select } from "@evershop/postgres-query-builder";
import { pool } from "@evershop/evershop/lib/postgres";
import { countries } from "@evershop/evershop/lib/locale/countries";
import { provinces } from "@evershop/evershop/lib/locale/provinces";
import { tgSend } from "../../services/telegram.js";

/**
 * Subscriber to send Telegram notification when an order is placed.
 * @param {Object} data - The event data.
 * @param {string|number} data.order_id - The ID of the placed order.
 */
export default async function sendOrderNotificationTelegram(data) {
    try {
        const orderId = data.order_id;
        // We use the pool directly or import it. Based on sendOrderConfirmationEmail.ts pattern.
        const order = await select()
            .from("order")
            .where("order_id", "=", orderId)
            .load(pool);

        if (!order) {
            console.error(`Order with ID ${orderId} not found for Telegram notification`);
            return;
        }

        const items = await select()
            .from("order_item")
            .where("order_item_order_id", "=", order.order_id)
            .execute(pool);

        const shippingAddress = await select()
            .from("order_address")
            .where("order_address_id", "=", order.shipping_address_id)
            .load(pool);

        const countryName = countries.find((c) => c.code === shippingAddress.country)?.name || shippingAddress.country;
        const provinceName = provinces.find((p) => p.code === shippingAddress.province)?.name || shippingAddress.province;

        const message = `🚀 <b>NEW ORDER #${order.order_number}</b>\n\n` +
            `<b>Customer:</b> ${order.customer_full_name} (${order.customer_email})\n` +
            `<b>Phone:</b> ${shippingAddress.phone || 'N/A'}\n` +
            `<b>Total:</b> ${order.grand_total} ${order.currency}\n` +
            `<b>Payment:</b> ${order.payment_method}\n\n` +
            `<b>Shipping Address:</b>\n` +
            `${shippingAddress.address_1}, ${shippingAddress.city}\n` +
            `${provinceName}, ${countryName}\n\n` +
            `<b>Items:</b>\n` +
            items.map((i) => `• ${i.product_name} (${i.product_sku}) x${i.qty} - ${i.final_price}`).join("\n");

        await tgSend(message);
    } catch (e) {
        console.error(`Failed to send Telegram notification: ${e.message}`);
    }
}
