require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 1. Add cashback settings to products table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cashback_type') THEN
    ALTER TABLE products ADD COLUMN cashback_type text DEFAULT 'global'; -- 'global', 'percent', 'fixed'
    ALTER TABLE products ADD COLUMN cashback_value numeric DEFAULT 0;
  END IF;
END $$;

-- 2. Update place_order with complex per-product cashback and promo-lock logic
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
  v_prod_id text;
  v_prod_qty int;
  v_prod_price numeric;
  v_global_rate numeric;
  v_global_enabled boolean;
  v_total_earned_cashback numeric := 0;
  v_item_cashback numeric := 0;
  v_p_cashback_type text;
  v_p_cashback_value numeric;
BEGIN
  -- 1. Get global settings
  SELECT (value->>'rate')::numeric, (value->>'enabled')::boolean 
  INTO v_global_rate, v_global_enabled
  FROM site_settings WHERE key = 'cashback_settings';

  -- 2. Stock Check
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

  -- 3. Order placement
  v_order_id := nextval('order_id_seq')::text;
  INSERT INTO orders (id, user_phone, items, total, address, coords, status, promo_code, discount_amount, created_at)
  VALUES (v_order_id, p_user_phone, p_items, p_total, p_address, to_jsonb(p_coords), p_status, p_promo_code, p_discount_amount, now());

  -- 4. Atomic Updates: Stock & Per-Product Cashback Calculation
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := v_item->>'id';
    v_prod_qty := (v_item->>'quantity')::int;
    v_prod_price := (v_item->>'price')::numeric;

    -- Update stock
    UPDATE products
    SET stock_details = (
      SELECT jsonb_object_agg(key, (value::int - (CASE WHEN key = (SELECT key FROM jsonb_each_text(stock_details) LIMIT 1) THEN v_prod_qty ELSE 0 END))::text)
      FROM jsonb_each_text(stock_details)
    )
    WHERE id = v_prod_id;

    -- Calculate cashback for this item ONLY IF no promo code used and global enabled
    IF v_global_enabled AND p_promo_code IS NULL THEN
        SELECT cashback_type, cashback_value INTO v_p_cashback_type, v_p_cashback_value
        FROM products WHERE id = v_prod_id;

        IF v_p_cashback_type = 'percent' THEN
            v_item_cashback := floor((v_prod_price * v_prod_qty) * (v_p_cashback_value / 100));
        ELSIF v_p_cashback_type = 'fixed' THEN
            v_item_cashback := v_p_cashback_value * v_prod_qty;
        ELSE -- Global
            v_item_cashback := floor((v_prod_price * v_prod_qty) * v_global_rate);
        END IF;

        v_total_earned_cashback := v_total_earned_cashback + v_item_cashback;
    END IF;
  END LOOP;

  -- 5. Finalize Promo usage count
  IF p_promo_code IS NOT NULL THEN
    UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = p_promo_code;
    -- Cashback is forced to 0
    v_total_earned_cashback := 0;
  END IF;

  -- 6. Apply Total Cashback Earning
  IF v_total_earned_cashback > 0 THEN
     UPDATE user_wallets SET balance = balance + v_total_earned_cashback, updated_at = now() WHERE user_phone = p_user_phone;
     INSERT INTO cashback_transactions (user_phone, order_id, amount, type, description)
     VALUES (p_user_phone, v_order_id, v_total_earned_cashback, 'earned', 'Xarid uchun jami cashback');
  END IF;

  RETURN jsonb_build_object('success', true, 'orderId', v_order_id, 'earnedCashback', v_total_earned_cashback);
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
    console.log('🔗 Connected to database for Advance Per-Product Cashback migration...');
    await client.query(sql);
    console.log('✅ Advanced Per-Product Cashback system and Promo-lock initialized!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}
main();
