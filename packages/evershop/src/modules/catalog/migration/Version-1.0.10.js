/**
 * Migration Version 1.0.10
 * Add unique index on supplier_sku to prevent duplicate imports
 */

module.exports = exports = {};

exports.execute = async (connection) => {
  // Create partial unique index (WHERE clause only works with CREATE INDEX, not CONSTRAINT)
  await connection.query(`
    CREATE UNIQUE INDEX unique_supplier_sku
    ON product (supplier_sku)
    WHERE supplier_sku IS NOT NULL;
  `);
};

exports.rollback = async (connection) => {
  await connection.query(`
    DROP INDEX IF EXISTS unique_supplier_sku;
  `);
};
