require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 1. Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL, -- 'fixed' or 'percent'
  discount_value numeric NOT NULL,
  min_order_amount numeric DEFAULT 0,
  max_discount_amount numeric, -- For percent discounts
  expires_at timestamp with time zone,
  usage_limit integer, -- Total times this code can be used
  usage_count integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Add promo_code used to orders table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='promo_code') THEN
    ALTER TABLE orders ADD COLUMN promo_code text;
    ALTER TABLE orders ADD COLUMN discount_amount numeric DEFAULT 0;
  END IF;
END $$;

-- 3. Update place_order function to handle promo codes
CREATE OR REPLACE FUNCTION place_order(
  p_user_phone text,
  p_items jsonb,
  p_total numeric,
  p_address text,
  p_coords numeric[],
  p_status text,
  p_promo_code text DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  v_order_id text;
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_stock_details jsonb;
  v_actual_stock integer;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  -- 1. Stock check
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'id';
    v_quantity := (v_item->>'quantity')::int;
    select stock_details into v_stock_details from products where id = v_product_id;
    v_actual_stock := coalesce((select sum(val::int) from jsonb_each_text(v_stock_details) as t(key, val)), 0);
    if v_actual_stock < v_quantity then
      v_errors := v_errors || jsonb_build_object(
        'id', v_product_id,
        'name', v_item->>'name',
        'available', v_actual_stock
      );
    end if;
  end loop;

  if jsonb_array_length(v_errors) > 0 then
    return jsonb_build_object('success', false, 'errors', v_errors);
  end if;

  -- 2. Promo code usage update
  if p_promo_code is not null then
    update promo_codes 
    set usage_count = usage_count + 1 
    where code = p_promo_code;
  end if;

  -- 3. Order placement
  v_order_id := nextval('order_id_seq')::text;
  insert into orders (id, user_phone, items, total, address, coords, status, promo_code, discount_amount, created_at)
  values (v_order_id, p_user_phone, p_items, p_total, p_address, p_coords, p_status, p_promo_code, p_discount_amount, now());

  return jsonb_build_object('success', true, 'orderId', v_order_id);
END;
$$ LANGUAGE plpgsql;
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
    console.log('🔗 Connected to database for promo codes migration...');
    await client.query(sql);
    console.log('✅ Promo codes table created and orders table updated!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

main();
