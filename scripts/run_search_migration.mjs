import fs from 'fs';
import pg from 'pg';

const url = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/132d8379-3723-45a6-a02d-bb9203322573/scratch/db_url.txt', 'utf8').trim();
const sql = fs.readFileSync('scripts/migration_search_stock_v1.sql', 'utf8');

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to DB. Running migration...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

    // Test 1: get_product_stock test
    const r1 = await client.query(`
      SELECT 
        get_product_stock(10, NULL) as test1,
        get_product_stock(0, '{"wh1": 15, "wh2": 5}'::jsonb) as test2,
        get_product_stock(5, '{}'::jsonb) as test3
    `);
    console.log('✅ get_product_stock unit test:', r1.rows[0]);

    // Test 2: advanced_smart_search test
    const r2 = await client.query(`
      SELECT id, name, price, stock, get_product_stock(stock, stock_details) as real_stock
      FROM advanced_smart_search('vgr', NULL, 0.25, 5, NULL)
    `);
    console.log(`✅ advanced_smart_search test: ${r2.rows.length} results returned.`);
    r2.rows.forEach(p => console.log(`   - ${p.name?.slice(0, 40)} | real_stock: ${p.real_stock}`));

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
