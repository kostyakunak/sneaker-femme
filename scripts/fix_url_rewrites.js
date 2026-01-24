const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'evershop',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function rebuildCategoryUrlRewrites() {
  console.log('🔄 Rebuilding category URL rewrites...');
  
  // Get all categories
  const categories = await pool.query(`
    SELECT c.category_id, c.uuid, c.parent_id, cd.url_key
    FROM category c
    LEFT JOIN category_description cd ON c.category_id = cd.category_description_category_id
    ORDER BY c.parent_id NULLS FIRST, c.category_id
  `);

  for (const category of categories.rows) {
    if (!category.url_key) continue;

    // Build path recursively
    const buildPath = async (catId) => {
      const cat = await pool.query(`
        SELECT c.category_id, c.parent_id, cd.url_key
        FROM category c
        LEFT JOIN category_description cd ON c.category_id = cd.category_description_category_id
        WHERE c.category_id = $1
      `, [catId]);

      if (cat.rows.length === 0 || !cat.rows[0].url_key) return '';

      const urlKey = cat.rows[0].url_key;
      const parentId = cat.rows[0].parent_id;

      if (parentId) {
        const parentPath = await buildPath(parentId);
        return parentPath ? `${parentPath}/${urlKey}` : `/${urlKey}`;
      } else {
        return `/${urlKey}`;
      }
    };

    const path = await buildPath(category.category_id);
    
    // Insert/update url_rewrite for category (for both languages)
    for (const language of ['uk', 'en']) {
      await pool.query(`
        INSERT INTO url_rewrite (entity_type, entity_uuid, request_path, target_path, language)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (entity_uuid, language) 
        DO UPDATE SET request_path = $3, target_path = $4
      `, [
        'category',
        category.uuid,
        path,
        `/category/${category.uuid}`,
        language
      ]);
    }

    console.log(`✅ Category: ${path} -> /category/${category.uuid}`);
  }
}

async function rebuildProductUrlRewrites() {
  console.log('\n🔄 Rebuilding product URL rewrites...');
  
  // Get all products with their categories
  const products = await pool.query(`
    SELECT 
      p.product_id,
      p.uuid,
      p.category_id,
      pd.url_key as product_url_key,
      c.uuid as category_uuid
    FROM product p
    LEFT JOIN product_description pd ON p.product_id = pd.product_description_product_id
    LEFT JOIN category c ON p.category_id = c.category_id
    WHERE pd.url_key IS NOT NULL
  `);

  for (const product of products.rows) {
    if (!product.product_url_key) continue;

    // Get category URL rewrite
    let categoryPath = '';
    if (product.category_uuid) {
      const categoryRewrite = await pool.query(`
        SELECT request_path 
        FROM url_rewrite 
        WHERE entity_uuid = $1 AND entity_type = 'category' AND language = 'uk'
        LIMIT 1
      `, [product.category_uuid]);

      if (categoryRewrite.rows.length > 0) {
        categoryPath = categoryRewrite.rows[0].request_path;
      }
    }

    // Build product path
    const productPath = categoryPath 
      ? `${categoryPath}/${product.product_url_key}`
      : `/${product.product_url_key}`;

    // Insert/update url_rewrite for product (for both languages)
    for (const language of ['uk', 'en']) {
      await pool.query(`
        INSERT INTO url_rewrite (entity_type, entity_uuid, request_path, target_path, language)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (entity_uuid, language) 
        DO UPDATE SET request_path = $3, target_path = $4
      `, [
        'product',
        product.uuid,
        productPath,
        `/product/${product.uuid}`,
        language
      ]);
    }

    console.log(`✅ Product: ${productPath} -> /product/${product.uuid}`);
  }
}

async function main() {
  try {
    await rebuildCategoryUrlRewrites();
    await rebuildProductUrlRewrites();
    console.log('\n✅ URL rewrites rebuilt successfully!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

main();
