require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
CREATE TABLE IF NOT EXISTS search_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id text references products(id) ON DELETE CASCADE,
  query text not null,
  click_count integer default 1,
  updated_at timestamp with time zone default now(),
  UNIQUE(product_id, query)
);

-- Function to handle click upsert and auto-tagging
CREATE OR REPLACE FUNCTION log_search_click(p_product_id text, p_query text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
    v_current_tags text;
BEGIN
    -- Upsert the click count
    INSERT INTO search_clicks (product_id, query, click_count, updated_at)
    VALUES (p_product_id, lower(trim(p_query)), 1, now())
    ON CONFLICT (product_id, query) DO UPDATE
    SET click_count = search_clicks.click_count + 1,
        updated_at = now()
    RETURNING click_count INTO v_count;

    -- If clicked 5 times from this exact query, auto-tag the product
    IF v_count = 5 THEN
        SELECT tag INTO v_current_tags FROM products WHERE id = p_product_id;
        
        -- Append the query to tags if it's not already there
        IF v_current_tags IS NULL THEN
            UPDATE products SET tag = lower(trim(p_query)) WHERE id = p_product_id;
        ELSIF v_current_tags NOT ILIKE '%' || lower(trim(p_query)) || '%' THEN
            UPDATE products SET tag = v_current_tags || ', ' || lower(trim(p_query)) WHERE id = p_product_id;
        END IF;
    END IF;
END;
$$;
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query(sql);
    console.log('✅ Search Clicks table and auto-tagging function created!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

main();
