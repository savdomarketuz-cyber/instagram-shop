require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 1. Create settings table
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Initialize cashback_rate to 2% (0.02)
INSERT INTO site_settings (key, value)
VALUES ('cashback_settings', '{"rate": 0.02, "enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Update place_order to use dynamic cashback rate from settings
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
  v_allow_cashback boolean := true;
  v_cashback_amount numeric := 0;
  v_cashback_rate numeric;
  v_cashback_enabled boolean;
BEGIN
  -- 1. Get dynamic cashback rate from settings
  SELECT (value->>'rate')::numeric, (value->>'enabled')::boolean 
  INTO v_cashback_rate, v_cashback_enabled
  FROM site_settings WHERE key = 'cashback_settings';

  -- 2. Check stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = (v_item->>'id')
      AND (SELECT SUM((value)::int) FROM jsonb_each_text(p.stock_details)) >= (v_item->>'quantity')::int
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Stock insufficient for ' || (v_item->>'name'));
    END IF;
  END LOOP;

  -- 3. Promo Code Logic
  IF p_promo_code IS NOT NULL THEN
    SELECT allow_cashback INTO v_allow_cashback 
    FROM promo_codes WHERE code = p_promo_code AND active = true;
    UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = p_promo_code;
  END IF;

  -- 4. Order placement
  v_order_id := nextval('order_id_seq')::text;
  INSERT INTO orders (id, user_phone, items, total, address, coords, status, promo_code, discount_amount, created_at)
  VALUES (v_order_id, p_user_phone, p_items, p_total, p_address, to_jsonb(p_coords), p_status, p_promo_code, p_discount_amount, now());

  -- 5. Atomic Stock update
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE products
    SET stock_details = (
      SELECT jsonb_object_agg(key, (value::int - (CASE WHEN key = (SELECT key FROM jsonb_each_text(stock_details) LIMIT 1) THEN (v_item->>'quantity')::int ELSE 0 END))::text)
      FROM jsonb_each_text(stock_details)
    )
    WHERE id = (v_item->>'id');
  END LOOP;

  -- 6. Dynamic Cashback Earning
  IF v_cashback_enabled AND v_allow_cashback THEN
    v_cashback_amount := floor(p_total * v_cashback_rate);
    IF v_cashback_amount > 0 THEN
       UPDATE user_wallets SET balance = balance + v_cashback_amount, updated_at = now() WHERE user_phone = p_user_phone;
       INSERT INTO cashback_transactions (user_phone, order_id, amount, type, description)
       VALUES (p_user_phone, v_order_id, v_cashback_amount, 'earned', 'Xarid uchun cashback (' || (v_cashback_rate * 100)::text || '%)');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'orderId', v_order_id, 'earnedCashback', v_cashback_amount);
END;
$$ LANGUAGE plpgsql;
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('🔗 Connected to database for Settings migration...');
    await client.query(sql);
    console.log('✅ Dynamic Cashback settings initialized!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}
main();
