require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

/**
 * Smart chegirma v2 — manual takliflar + checkout (pul) integratsiyasi (#44).
 *
 * Additiv o'zgarishlar:
 *  - smart_discount_offers: source ('ai'|'manual'), created_by, expires_at NULL bo'lishi mumkin (doimiy taklif)
 *  - orders: smart_discount_amount, smart_offer_ids
 *  - place_order (AKTIV signatura: p_user_phone,p_items,p_address,p_coords,p_status,p_promo_code,p_wallet_usage)
 *    YANGI overload qo'shilmaydi — aynan shu funksiya CREATE OR REPLACE qilinadi.
 *    Mavjud mantiq (promo, wallet, stock, sales) O'ZGARMAYDI; faqat smart-chegirma bloki QO'SHILADI.
 *    RPC ichida offer SERVER tomonda tekshiriladi (status active, egasi mos, muddati o'tmagan) — atomik & xavfsiz.
 *    Doimiy (expires_at IS NULL) takliflar 'redeemed' qilinmaydi — qayta ishlatish uchun aktiv qoladi.
 *
 * ROLLBACK: original ta'rif scripts/_place_order_v2_backup.sql ichida saqlangan.
 */

const sql = `
-- 1. Offers: manual + doimiy taklif uchun
ALTER TABLE smart_discount_offers ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ai';
ALTER TABLE smart_discount_offers ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE smart_discount_offers ALTER COLUMN expires_at DROP NOT NULL;

-- 2. Orders: smart chegirma izlari
ALTER TABLE orders ADD COLUMN IF NOT EXISTS smart_discount_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS smart_offer_ids jsonb DEFAULT '[]'::jsonb;

-- 3. Aktiv place_order funksiyasini smart-chegirma bilan kengaytirish (overload QO'SHILMAYDI)
CREATE OR REPLACE FUNCTION public.place_order(
  p_user_phone text, p_items jsonb, p_address text, p_coords jsonb, p_status text,
  p_promo_code text DEFAULT NULL::text, p_wallet_usage numeric DEFAULT 0
)
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
  v_affiliate_phone text := NULL;   -- FIX: oldin v_affiliate_user RECORD edi va promo'siz buyurtmada
                                    -- "record not assigned yet" xatosi chiqarardi (checkout buziq edi)
  v_affiliate_settings jsonb;
  v_referrer_reward numeric := 0;
  v_buyer_discount numeric := 0;
  -- SMART CHEGIRMA
  v_smart_discount numeric := 0;
  v_so_id uuid;
  v_so_percent int;
  v_smart_offer_ids jsonb := '[]'::jsonb;
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

    -- SMART CHEGIRMA: shu user×mahsulotга aktiv taklif bormi? (server tomonda tekshiriladi)
    SELECT id, percent INTO v_so_id, v_so_percent
    FROM smart_discount_offers
    WHERE user_identifier = p_user_phone
      AND product_id = v_product_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY percent DESC
    LIMIT 1;
    IF v_so_id IS NOT NULL THEN
      v_smart_discount := v_smart_discount + floor((v_price * v_quantity) * v_so_percent / 100.0);
      v_smart_offer_ids := v_smart_offer_ids || to_jsonb(v_so_id::text);
      v_so_id := NULL;
    END IF;
  END LOOP;

  IF jsonb_array_length(v_stock_errors) > 0 THEN RETURN jsonb_build_object('success', false, 'errors', v_stock_errors); END IF;

  -- Smart chegirma subtotaldan ayriladi
  v_calculated_total := v_calculated_subtotal - v_smart_discount;

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
      SELECT phone INTO v_affiliate_phone FROM users WHERE affiliate_code = p_promo_code;
      IF FOUND AND v_affiliate_phone IS NOT NULL AND v_affiliate_phone != p_user_phone THEN
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
  INSERT INTO orders (id, user_phone, items, total, address, coords, status, promo_code, discount_amount, wallet_amount, smart_discount_amount, smart_offer_ids, created_at)
  VALUES (v_order_id, p_user_phone, p_items, v_calculated_total, p_address, p_coords, p_status, p_promo_code, v_discount_amount, p_wallet_usage, v_smart_discount, v_smart_offer_ids, now());

  -- Vaqtli (AI/manual-vaqtli) takliflarni 'redeemed' qilamiz; DOIMIY (expires_at IS NULL) aktiv qoladi
  IF jsonb_array_length(v_smart_offer_ids) > 0 THEN
    UPDATE smart_discount_offers
    SET status = 'redeemed', redeemed_at = now(), order_id = v_order_id
    WHERE id IN (SELECT (jsonb_array_elements_text(v_smart_offer_ids))::uuid)
      AND expires_at IS NOT NULL;
  END IF;

  IF v_referrer_reward > 0 AND v_affiliate_phone IS NOT NULL THEN
    INSERT INTO affiliate_transactions (affiliate_phone, buyer_phone, order_id, amount, status)
    VALUES (v_affiliate_phone, p_user_phone, v_order_id::bigint, v_referrer_reward, 'pending');
  END IF;

  RETURN jsonb_build_object('success', true, 'orderId', v_order_id, 'total', v_calculated_total, 'smartDiscount', v_smart_discount);
END;
$function$;
`;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('Connected to DB');
        await client.query(sql);
        console.log('✅ Smart discount v2 applied: offers/orders columns + place_order auto-apply.');
    } catch (err) {
        console.error('❌ DB Setup Error:', err);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

main();
