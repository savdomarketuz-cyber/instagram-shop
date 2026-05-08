const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- 1. Promo Code Tariffs Table
CREATE TABLE IF NOT EXISTS promo_code_tariffs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL, -- 'fixed' or 'percentage'
    discount_value numeric NOT NULL,
    min_order_value numeric DEFAULT 0,
    max_discount numeric,
    affiliate_reward_type text NOT NULL, -- 'fixed_per_use', 'percent_of_final_price', 'percent_of_discount'
    affiliate_reward_value numeric NOT NULL,
    usage_limit integer DEFAULT 1000,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Affiliate Promo Codes
CREATE TABLE IF NOT EXISTS affiliate_promo_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid REFERENCES users(id),
    tariff_id uuid REFERENCES promo_code_tariffs(id),
    code text UNIQUE NOT NULL,
    usage_count integer DEFAULT 0,
    total_earned numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Affiliate Referral Links (Enhanced)
CREATE TABLE IF NOT EXISTS affiliate_referral_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid REFERENCES users(id),
    product_id uuid REFERENCES products(id),
    slug text UNIQUE NOT NULL,
    clicks integer DEFAULT 0,
    conversions integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Affiliate Event Logs (Clicks, Views, Conversions)
CREATE TABLE IF NOT EXISTS affiliate_event_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid REFERENCES users(id),
    link_id uuid REFERENCES affiliate_referral_links(id),
    order_id text,
    event_type text NOT NULL, -- 'click', 'view', 'promo_use'
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Helper Functions for Counters
CREATE OR REPLACE FUNCTION increment_promo_usage(p_promo_id uuid, p_earned numeric)
RETURNS void AS $$
BEGIN
    UPDATE affiliate_promo_codes
    SET usage_count = usage_count + 1,
        total_earned = total_earned + p_earned
    WHERE id = p_promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_link_conversions(p_link_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE affiliate_referral_links
    SET conversions = conversions + 1
    WHERE id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. UPDATED place_order RPC with Affiliate Promo Support
CREATE OR REPLACE FUNCTION place_order(
  p_user_phone text,
  p_items jsonb,
  p_address text,
  p_coords jsonb,
  p_status text,
  p_promo_code text DEFAULT NULL,
  p_wallet_usage numeric DEFAULT 0
) RETURNS jsonb AS $$
DECLARE
  v_item jsonb;
  v_product_id text;
  v_quantity int;
  v_price numeric;
  v_calculated_subtotal numeric := 0;
  v_calculated_total numeric := 0;
  v_discount_amount numeric := 0;
  v_wallet_balance numeric := 0;
  v_order_id text;
  v_stock_details jsonb;
  v_new_stock_details jsonb;
  v_wh_id text;
  v_wh_stock int;
  v_remaining_qty int;
  v_stock_errors jsonb := '[]'::jsonb;
  v_promo RECORD;
  v_aff_promo RECORD;
BEGIN
  -- 0. USER VALIDATION
  IF EXISTS (SELECT 1 FROM users WHERE phone = p_user_phone AND (banned_until > now() OR deleted_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'Ushbu raqam bloklangan yoki o''''chirilgan.';
  END IF;

  -- 1. PRICE & STOCK VALIDATION
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_quantity := (v_item->>'quantity')::int;
    SELECT price, stock_details INTO v_price, v_stock_details FROM products WHERE id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_product_id; END IF;
    v_calculated_subtotal := v_calculated_subtotal + (v_price * v_quantity);
    SELECT COALESCE(SUM((val)::int), 0) INTO v_wh_stock FROM jsonb_each_text(v_stock_details) AS t(key, val);
    IF v_wh_stock < v_quantity THEN
      v_stock_errors := v_stock_errors || jsonb_build_object('id', v_product_id, 'name', v_item->>'name', 'available', v_wh_stock);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_stock_errors) > 0 THEN RETURN jsonb_build_object('success', false, 'errors', v_stock_errors); END IF;
  v_calculated_total := v_calculated_subtotal;

  -- 2. PROMO CODE LOGIC (Standard + Affiliate)
  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    -- Try Standard Promo
    SELECT * INTO v_promo FROM promo_codes WHERE code = p_promo_code AND active = true AND (expires_at IS NULL OR expires_at > now()) AND (usage_limit IS NULL OR usage_count < usage_limit) FOR UPDATE;
    
    IF FOUND THEN
      IF v_calculated_subtotal >= v_promo.min_order_amount THEN
        IF v_promo.discount_type = 'fixed' THEN v_discount_amount := v_promo.discount_value;
        ELSIF v_promo.discount_type = 'percent' THEN 
          v_discount_amount := (v_calculated_subtotal * v_promo.discount_value) / 100;
          IF v_promo.max_discount_amount IS NOT NULL AND v_discount_amount > v_promo.max_discount_amount THEN v_discount_amount := v_promo.max_discount_amount; END IF;
        END IF;
        v_calculated_total := v_calculated_total - v_discount_amount;
        UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = v_promo.id;
      END IF;
    ELSE
      -- Try Affiliate Promo
      SELECT apc.*, pct.type as t_type, pct.discount_value as t_value, pct.min_order_value as t_min, pct.max_discount as t_max, pct.usage_limit as t_limit 
      INTO v_aff_promo 
      FROM affiliate_promo_codes apc
      JOIN promo_code_tariffs pct ON apc.tariff_id = pct.id
      WHERE apc.code = UPPER(p_promo_code) AND pct.is_active = true AND apc.usage_count < pct.usage_limit;

      IF FOUND THEN
        IF v_calculated_subtotal >= v_aff_promo.t_min THEN
          IF v_aff_promo.t_type = 'fixed' THEN v_discount_amount := v_aff_promo.t_value;
          ELSIF v_aff_promo.t_type = 'percentage' THEN
            v_discount_amount := (v_calculated_subtotal * v_aff_promo.t_value) / 100;
            IF v_aff_promo.t_max IS NOT NULL AND v_discount_amount > v_aff_promo.t_max THEN v_discount_amount := v_aff_promo.t_max; END IF;
          END IF;
          v_calculated_total := v_calculated_total - v_discount_amount;
          -- Usage count incremented in API to handle reward logic safely
        END IF;
      END IF;
    END IF;
  END IF;

  -- 3. WALLET LOGIC
  IF p_wallet_usage > 0 THEN
    SELECT balance INTO v_wallet_balance FROM user_wallets WHERE user_phone = p_user_phone FOR UPDATE;
    v_wallet_balance := COALESCE(v_wallet_balance, 0);
    p_wallet_usage := LEAST(v_wallet_balance, p_wallet_usage, v_calculated_total);
    IF p_wallet_usage > 0 THEN
      UPDATE user_wallets SET balance = balance - p_wallet_usage WHERE user_phone = p_user_phone;
      v_calculated_total := v_calculated_total - p_wallet_usage;
    END IF;
  END IF;

  -- 4. DEDUCT STOCK
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := v_item->>'id'; v_quantity := (v_item->>'quantity')::int;
    SELECT stock_details INTO v_stock_details FROM products WHERE id = v_product_id;
    v_new_stock_details := v_stock_details; v_remaining_qty := v_quantity;
    FOR v_wh_id, v_wh_stock IN SELECT * FROM jsonb_each_text(v_stock_details) AS t(key, val) LOOP
      IF v_remaining_qty <= 0 THEN EXIT; END IF;
      IF (v_wh_stock::int) >= v_remaining_qty THEN
        v_new_stock_details := jsonb_set(v_new_stock_details, ARRAY[v_wh_id], to_jsonb((v_wh_stock::int) - v_remaining_qty)); v_remaining_qty := 0;
      ELSE
        v_remaining_qty := v_remaining_qty - (v_wh_stock::int); v_new_stock_details := jsonb_set(v_new_stock_details, ARRAY[v_wh_id], '0'::jsonb);
      END IF;
    END LOOP;
    UPDATE products SET stock_details = v_new_stock_details, sales = sales + v_quantity WHERE id = v_product_id;
  END LOOP;

  -- 5. CREATE ORDER
  v_order_id := nextval('order_id_seq')::text;
  INSERT INTO orders (id, user_phone, items, total, address, coords, status, promo_code, discount_amount, wallet_amount, created_at)
  VALUES (v_order_id, p_user_phone, p_items, v_calculated_total, p_address, p_coords, p_status, p_promo_code, v_discount_amount, p_wallet_usage, now());

  RETURN jsonb_build_object('success', true, 'orderId', v_order_id, 'total', v_calculated_total);
END;
$$ LANGUAGE plpgsql;
`;

async function runMigration() {
    console.log('🚀 Starting MLM Affiliate Expansion migration...');
    // Note: You must run this SQL in Supabase SQL Editor manually if admin_run_sql is not available.
    console.log('--- SQL START ---');
    console.log(sql);
    console.log('--- SQL END ---');
}

runMigration();
