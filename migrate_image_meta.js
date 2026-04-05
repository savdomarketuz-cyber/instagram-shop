require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_metadata jsonb DEFAULT '{}'::jsonb;
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres!');
    console.log('Adding image_metadata column to products table...');
    await client.query(sql);
    console.log('✅ Column added successfully!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

main();
