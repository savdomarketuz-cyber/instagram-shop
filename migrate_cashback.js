require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 1. Create user_wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
  user_phone text PRIMARY KEY REFERENCES users(phone) ON DELETE CASCADE,
  wallet_number text UNIQUE NOT NULL,
  balance numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create cashback_transactions table
CREATE TABLE IF NOT EXISTS cashback_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text REFERENCES users(phone) ON DELETE CASCADE,
  order_id text REFERENCES orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  type text NOT NULL, -- 'earned', 'spent', 'refunded', 'manual', 'penalty'
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Add allow_cashback to promo_codes
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promo_codes' AND column_name='allow_cashback') THEN
    ALTER TABLE promo_codes ADD COLUMN allow_cashback boolean DEFAULT true;
  END IF;
END $$;

-- 4. Function to generate a unique 16-digit wallet number
CREATE OR REPLACE FUNCTION generate_wallet_number()
RETURNS text AS $$
DECLARE
  v_num text;
  v_exists boolean;
BEGIN
  LOOP
    v_num := '4444' || lpad(floor(random() * 1000000000000)::text, 12, '0');
    SELECT EXISTS(SELECT 1 FROM user_wallets WHERE wallet_number = v_num) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_num;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Atomic place_order with cashback accumulation
-- First, drop existing functions to avoid overloading issues
DROP FUNCTION IF EXISTS place_order(text, jsonb, numeric, text, numeric[], text);
DROP FUNCTION IF EXISTS place_order(text, jsonb, numeric, text, numeric[], text, text, numeric);

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
  v_promo_valid boolean := true;
  v_allow_cashback boolean := true;
  v_cashback_amount numeric := 0;
  v_cashback_rate numeric := 0.02; -- 2% Default cashback
BEGIN
  -- Stock Check
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

  -- Promo Code Logic & Cashback Restriction
  IF p_promo_code IS NOT NULL THEN
    SELECT allow_cashback INTO v_allow_cashback 
    FROM promo_codes WHERE code = p_promo_code AND active = true;
    
    UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = p_promo_code;
  END IF;

  -- Order placement
  v_order_id := nextval('order_id_seq')::text;
  INSERT INTO orders (id, user_phone, items, total, address, coords, status, promo_code, discount_amount, created_at)
  VALUES (v_order_id, p_user_phone, p_items, p_total, p_address, to_jsonb(p_coords), p_status, p_promo_code, p_discount_amount, now());

  -- Stock update
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE products
    SET stock_details = (
      SELECT jsonb_object_agg(key, (value::int - (CASE WHEN key = (SELECT key FROM jsonb_each_text(stock_details) LIMIT 1) THEN (v_item->>'quantity')::int ELSE 0 END))::text)
      FROM jsonb_each_text(stock_details)
    )
    WHERE id = (v_item->>'id');
  END LOOP;

  -- Cashback Earning
  IF v_allow_cashback THEN
    v_cashback_amount := floor(p_total * v_cashback_rate);
    IF v_cashback_amount > 0 THEN
       UPDATE user_wallets SET balance = balance + v_cashback_amount, updated_at = now() WHERE user_phone = p_user_phone;
       
       INSERT INTO cashback_transactions (user_phone, order_id, amount, type, description)
       VALUES (p_user_phone, v_order_id, v_cashback_amount, 'earned', 'Xarid uchun cashback (+2%)');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'orderId', v_order_id, 'earnedCashback', v_cashback_amount);
END;
$$ LANGUAGE plpgsql;

-- 6. Function to handle cashback penalty
CREATE OR REPLACE FUNCTION handle_return_cashback_penalty(p_order_id text)
RETURNS void AS $$
DECLARE
  v_earned_cashback numeric;
  v_user_phone text;
BEGIN
  SELECT amount, user_phone INTO v_earned_cashback, v_user_phone 
  FROM cashback_transactions 
  WHERE order_id = p_order_id AND type = 'earned';

  IF v_earned_cashback > 0 THEN
    UPDATE user_wallets SET balance = balance - v_earned_cashback, updated_at = now() WHERE user_phone = v_user_phone;
    INSERT INTO cashback_transactions (user_phone, order_id, amount, type, description)
    VALUES (v_user_phone, p_order_id, -v_earned_cashback, 'penalty', 'Mahsulot qaytarilganligi uchun cashback bekor qilindi');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Ensure Wallet Trigger
CREATE OR REPLACE FUNCTION ensure_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_wallets (user_phone, wallet_number)
  VALUES (NEW.phone, generate_wallet_number())
  ON CONFLICT (user_phone) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_user_wallet ON users;
CREATE TRIGGER tr_ensure_user_wallet
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION ensure_user_wallet();

-- Init wallets
INSERT INTO user_wallets (user_phone, wallet_number)
SELECT phone, generate_wallet_number()
FROM users
ON CONFLICT (user_phone) DO NOTHING;
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('🔗 Connected to database for Advance Cashback migration...');
    await client.query(sql);
    console.log('✅ Advanced Cashback system initialized with atomic order logic and penalties!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}
main();
