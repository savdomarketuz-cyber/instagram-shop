require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 1. Add delivered_at column to orders if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivered_at') THEN
    ALTER TABLE orders ADD COLUMN delivered_at timestamp with time zone;
  END IF;
END $$;

-- 2. Create order_returns table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text REFERENCES orders(id),
  user_phone text,
  items jsonb NOT NULL,
  reason text,
  status text DEFAULT 'pending', -- pending, approved, rejected, completed
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Update existing 'Yetkazildi' orders to have a fallback delivered_at
UPDATE orders SET delivered_at = created_at WHERE status = 'Yetkazildi' AND delivered_at IS NULL;
`;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database...');
    console.log('⚙️ Running migrations for Returns system...');
    await client.query(sql);
    console.log('✅ Migration successful! Returns system is now synchronized with the database.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

main();
