require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 1. Create Telemetry Logs Table
CREATE TABLE IF NOT EXISTS user_telemetry_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_identifier text NOT NULL, -- can be phone number or session id
    event_type text NOT NULL,      -- e.g. PRODUCT_VIEW, SEARCH, CLICK, DWELL_TIME, CART_ADD
    product_id text REFERENCES products(id) ON DELETE SET NULL,
    category_id text,
    event_value numeric,           -- e.g. dwell time in seconds, or search result count
    event_metadata jsonb,          -- e.g. {"device": "ios", "price": 120000, "color": "red"}
    created_at timestamp with time zone DEFAULT now()
);

-- Index for fast aggregation cron jobs
CREATE INDEX IF NOT EXISTS idx_telemetry_user ON user_telemetry_logs(user_identifier);
CREATE INDEX IF NOT EXISTS idx_telemetry_event ON user_telemetry_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON user_telemetry_logs(created_at);

-- 2. Update specific objective score columns in Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_views integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_wishlists integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_returns integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating numeric DEFAULT 0.0;
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
    console.log('✅ Telemetry logs table and product ranking columns created successfully!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

main();
