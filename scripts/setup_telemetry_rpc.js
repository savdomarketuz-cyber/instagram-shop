require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
CREATE OR REPLACE FUNCTION increment_product_views(p_id text)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE products 
  SET total_views = COALESCE(total_views, 0) + 1 
  WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION increment_product_wishlists(p_id text, p_value int)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE products 
  SET total_wishlists = COALESCE(total_wishlists, 0) + p_value 
  WHERE id = p_id;
$$;
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ RPC functions for atomic increments created!');
  } finally {
    await client.end();
  }
}

main();
