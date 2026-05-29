-- ROLLBACK BACKUP: aktiv place_order signaturasining ORIGINAL ta'rifi (smart-chegirmadan OLDIN).
-- Agar v2 muammo chiqarsa, shu faylni jonli bazaga qo'llab eski holatga qaytariladi.
CREATE OR REPLACE FUNCTION public.place_order(p_user_phone text, p_items jsonb, p_address text, p_coords jsonb, p_status text, p_promo_code text DEFAULT NULL::text, p_wallet_usage numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
  v_affiliate_user RECORD;
  v_affiliate_settings jsonb;
  v_referrer_reward numeric := 0;
  v_buyer_discount numeric := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE phone = p_user_phone AND (banned_until > now() OR deleted_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'Ushbu raqam bloklangan yoki o''chirilgan.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_quantity := (v_item->>'quantity')::int;
    SELECT price, stock_details INTO v_price, v_stock_details FROM products WHERE id = v_product_id FOR UPDATE;
    v_calculated_subtotal := v_calculated_subtotal + (v_price * v_quantity);
    SELECT COALESCE(SUM((val)::int), 0) INTO v_wh_stock FROM jsonb_each_text(v_stock_details) AS t(key, val);
    IF v_wh_stock < v_quantity THEN
      v_stock_errors := v_stock_errors || jsonb_build_object('id', v_product_id, 'name', v_item->>'name', 'available', v_wh_stock);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_stock_errors) > 0 THEN RETURN jsonb_build_object('success', false, 'errors', v_stock_errors); END IF;
  v_calculated_total := v_calculated_subtotal;

  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    SELECT * INTO v_promo FROM promo_codes WHERE code = p_promo_code AND active = true AND (expires_at IS NULL OR expires_at > now()) AND (usage_limit IS NULL OR usage_count < usage_limit) FOR UPDATE;
    IF FOUND THEN
      IF v_calculated_subtotal >= v_promo.min_order_amount THEN
        IF v_promo.discount_type = 'fixed' THEN v_discount_amount := v_promo.discount_value;
        ELSIF v_promo.discount_type = 'percent' THEN v_discount_amount := (v_calculated_subtotal * v_promo.discount_value) / 100;
          IF v_promo.max_discount_amount IS NOT NULL AND v_discount_amount > v_promo.max_discount_amount THEN v_discount_amount := v_promo.max_discount_amount; END IF;
        END IF;
        v_calculated_total := v_calculated_total - v_discount_amount;
        UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = v_promo.id;
      END IF;
    ELSE
      SELECT phone INTO v_affiliate_user FROM users WHERE affiliate_code = p_promo_code;
      IF FOUND AND v_affiliate_user.phone != p_user_phone THEN
        SELECT value INTO v_affiliate_settings FROM site_settings WHERE key = 'affiliate_settings';
        v_buyer_discount := (v_affiliate_settings->>'buyer_discount')::numeric;
        v_referrer_reward := (v_affiliate_settings->>'referrer_reward')::numeric;
        v_discount_amount := v_buyer_discount;
        v_calculated_total := v_calculated_total - v_discount_amount;
      END IF;
    END IF;
  END IF;

  IF p_wallet_usage > 0 THEN
    SELECT balance INTO v_wallet_balance FROM user_wallets WHERE user_phone = p_user_phone FOR UPDATE;
    p_wallet_usage := LEAST(COALESCE(v_wallet_balance, 0), p_wallet_usage, v_calculated_total);
    IF p_wallet_usage > 0 THEN
      UPDATE user_wallets SET balance = balance - p_wallet_usage WHERE user_phone = p_user_phone;
      v_calculated_total := v_calculated_total - p_wallet_usage;
    END IF;
  END IF;

  IF v_calculated_total < 0 THEN v_calculated_total := 0; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id'; v_quantity := (v_item->>'quantity')::int; v_remaining_qty := v_quantity;
    SELECT stock_details INTO v_stock_details FROM products WHERE id = v_product_id;
    v_new_stock_details := v_stock_details;
    FOR v_wh_id, v_wh_stock IN SELECT * FROM jsonb_each_text(v_stock_details) AS t(key, val)
    LOOP
      IF v_remaining_qty <= 0 THEN EXIT; END IF;
      IF (v_wh_stock::int) >= v_remaining_qty THEN v_new_stock_details := jsonb_set(v_new_stock_details, ARRAY[v_wh_id], to_jsonb((v_wh_stock::int) - v_remaining_qty)); v_remaining_qty := 0;
      ELSE v_remaining_qty := v_remaining_qty - (v_wh_stock::int); v_new_stock_details := jsonb_set(v_new_stock_details, ARRAY[v_wh_id], '0'::jsonb); END IF;
    END LOOP;
    UPDATE products SET stock_details = v_new_stock_details, sales = sales + v_quantity WHERE id = v_product_id;
  END LOOP;

  v_order_id := nextval('order_id_seq')::text;
  INSERT INTO orders (id, user_phone, items, total, address, coords, status, promo_code, discount_amount, wallet_amount, created_at)
  VALUES (v_order_id, p_user_phone, p_items, v_calculated_total, p_address, p_coords, p_status, p_promo_code, v_discount_amount, p_wallet_usage, now());

  IF v_referrer_reward > 0 AND v_affiliate_user.phone IS NOT NULL THEN
    INSERT INTO affiliate_transactions (affiliate_phone, buyer_phone, order_id, amount, status)
    VALUES (v_affiliate_user.phone, p_user_phone, v_order_id::bigint, v_referrer_reward, 'pending');
  END IF;

  RETURN jsonb_build_object('success', true, 'orderId', v_order_id, 'total', v_calculated_total);
END;
$function$;
