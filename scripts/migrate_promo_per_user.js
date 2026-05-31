require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// Promo kod: har bir foydalanuvchi uchun ishlatish limiti + per-user hisob jadvali.
// per_user_limit: NULL yoki 0 = cheksiz; 1/3/10... = shuncha marta.
const sql = `
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS per_user_limit integer;

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  user_phone  text NOT NULL,
  order_id    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code_phone ON promo_redemptions(code, user_phone);
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    const check = async (table, col) => {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [table, col]);
      console.log(`   ${table}.${col}:`, rows.length ? 'OK' : 'MISSING');
    };
    await check('promo_codes', 'per_user_limit');
    await check('promo_redemptions', 'user_phone');
    console.log('✅ Done.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main();
