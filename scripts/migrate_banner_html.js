require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// Idempotent, additive-only: banner HTML kontenti ustunlari (uz/ru).
// Rasmli bannerdan to'liq HTML bannerga o'tish uchun.
const sql = `
ALTER TABLE banners ADD COLUMN IF NOT EXISTS html_uz text;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS html_ru text;
-- Eski NOT NULL rasm ustunlari yangi (rasmsiz) bannerlarni bloklab qo'ymasin
ALTER TABLE banners ALTER COLUMN image_url_uz DROP NOT NULL;
ALTER TABLE banners ALTER COLUMN image_url_ru DROP NOT NULL;
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('🔗 Connected. Adding banner HTML columns...');
    await client.query(sql);
    console.log('✅ Done.');

    const check = async (table, col) => {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [table, col]);
      console.log(`   ${table}.${col}:`, rows.length ? 'OK' : 'MISSING');
    };
    await check('banners', 'html_uz');
    await check('banners', 'html_ru');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main();
