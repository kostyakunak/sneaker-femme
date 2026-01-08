import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // 1. Drop the legacy trigger that deducts stock immediately upon order item insertion
  await execute(
    connection,
    `DROP TRIGGER IF EXISTS "TRIGGER_AFTER_INSERT_ORDER_ITEM" ON "order_item"`
  );

  // 2. Create the function to deduct stock when the order is paid
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION reduce_product_stock_when_order_paid()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE product_inventory pi
      SET qty = pi.qty - oi.qty
      FROM order_item oi
      WHERE oi.order_item_order_id = NEW.order_id
        AND oi.product_id = pi.product_inventory_product_id
        AND pi.manage_stock = TRUE;

      RETURN NEW;
    END;
    $$`
  );

  // 3. Create the trigger to fire the function when payment_status changes to 'paid'
  await execute(
    connection,
    `DROP TRIGGER IF EXISTS "TRIGGER_AFTER_ORDER_PAID" ON "order"`
  );

  await execute(
    connection,
    `CREATE TRIGGER "TRIGGER_AFTER_ORDER_PAID"
    AFTER UPDATE OF payment_status ON "order"
    FOR EACH ROW
    WHEN (NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid')
    EXECUTE FUNCTION reduce_product_stock_when_order_paid()`
  );
};
