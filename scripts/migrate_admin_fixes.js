require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// Idempotent, additive-only schema fixes for admin panel features.
// Safe to re-run. No data loss.
const sql = `
-- 1) Express (tezkor) yetkazish bayrog'i
ALTER TABLE products ADD COLUMN IF NOT EXISTS express_delivery boolean DEFAULT false;

-- 2) Banner — blur placeholderlar va rasm metama'lumotlari
ALTER TABLE banners ADD COLUMN IF NOT EXISTS blur_data_url_uz text;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS blur_data_url_ru text;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS image_meta jsonb;

-- 3) Blog — admin panel kutadigan ustunlar
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt_uz text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt_ru text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS read_time integer DEFAULT 5;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS linked_product_ids text[] DEFAULT '{}';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS blur_data_url text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
-- Legacy NOT NULL ustunlar yangi yozuvlarni bloklab qo'ymasin
ALTER TABLE blogs ALTER COLUMN title DROP NOT NULL;
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('🔗 Connected. Applying admin-panel schema fixes...');
    await client.query(sql);
    console.log('✅ Done.');

    // Verify
    const check = async (table, col) => {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [table, col]);
      console.log(`   ${table}.${col}:`, rows.length ? 'OK' : 'MISSING');
    };
    await check('products', 'express_delivery');
    await check('banners', 'image_meta');
    await check('blogs', 'linked_product_ids');
    await check('blogs', 'excerpt_uz');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main();
