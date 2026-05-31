require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// Ombor (do'kon) logosi — mahsulot kartochkasida va do'kon kartasida ko'rsatish uchun.
const sql = `ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS logo text;`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    const { rows } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='warehouses' AND column_name='logo'`);
    console.log('warehouses.logo:', rows.length ? 'OK' : 'MISSING');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main();
