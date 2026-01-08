import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
    await execute(
        connection,
        `ALTER TABLE product 
     ADD COLUMN IF NOT EXISTS supplier_price numeric(12,4),
     ADD COLUMN IF NOT EXISTS supplier_currency character varying(10),
     ADD COLUMN IF NOT EXISTS supplier_updated_at timestamp with time zone`
    );
};
