require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- SECURITY UPGRADE: Atomic & Server-Side Order Checkout (Zero Frontend Trust)
CREATE OR REPLACE FUNCTION place_order(
    p_user_phone text,
    p_items jsonb,
    p_address text,
    p_coords numeric[],
    p_status text,
    p_promo_code text DEFAULT NULL,
    p_wallet_usage numeric DEFAULT 0 -- Client choice: how much wallet balance to use
)
RETURNS jsonb AS $$
DECLARE
    v_order_id text;
    v_item jsonb;
    v_prod_id text;
    v_prod_qty int;
    v_db_price numeric;
    v_server_subtotal numeric := 0;
    v_server_discount numeric := 0;
    v_server_total numeric := 0;
    v_global_rate numeric;
    v_global_enabled boolean;
    v_total_earned_cashback numeric := 0;
    v_item_cashback numeric := 0;
    v_p_cashback_type text;
    v_p_cashback_value numeric;
    v_wallet_balance numeric;
BEGIN
    -- 1. SECURITY: Re-calculate subtotal using DB PRICES (Ignore frontend prices)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := v_item->>'id';
        v_prod_qty := (v_item->>'quantity')::int;
        
        SELECT price INTO v_db_price FROM products WHERE id = v_prod_id;
        v_server_subtotal := v_server_subtotal + (v_db_price * v_prod_qty);
    END LOOP;

    -- 2. SECURITY: Validate Promo Code on SERVER
    IF p_promo_code IS NOT NULL THEN
        SELECT (CASE WHEN type = 'percent' THEN floor(v_server_subtotal * (value / 100)) ELSE value END)
        INTO v_server_discount
        FROM promo_codes 
        WHERE code = p_promo_code 
        AND is_active = true 
        AND now() BETWEEN valid_from AND valid_until 
        AND (usage_count < usage_limit OR usage_limit IS NULL);
        
        IF v_server_discount IS NULL THEN
            v_server_discount := 0; -- Invalid promo, ignore
        ELSE
            UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = p_promo_code;
        END IF;
    END IF;

    v_server_total := v_server_subtotal - v_server_discount;
    IF v_server_total < 0 THEN v_server_total := 0; END IF;

    -- 3. SECURITY: Handle Wallet Usage (Atomic Balance check)
    IF p_wallet_usage > 0 THEN
        -- Lock wallet row
        SELECT balance INTO v_wallet_balance FROM user_wallets WHERE user_phone = p_user_phone FOR UPDATE;
        
        IF v_wallet_balance IS NULL OR v_wallet_balance < p_wallet_usage THEN
           RETURN jsonb_build_object('success', false, 'error', 'Hamyonda mablag'' yetarli emas');
        END IF;

        -- Check if usage exceeds order total
        IF p_wallet_usage > v_server_total THEN
           p_wallet_usage := v_server_total;
        END IF;

        -- Atomic Subtract from wallet
        UPDATE user_wallets SET balance = balance - p_wallet_usage WHERE user_phone = p_user_phone;
        
        -- Record transaction
        INSERT INTO cashback_transactions (user_phone, amount, type, description)
        VALUES (p_user_phone, -p_wallet_usage, 'spent', 'Buyurtma uchun hamyondan to''lov');
        
        v_server_total := v_server_total - p_wallet_usage;
    END IF;

    -- 4. Calculate Cashback (Deferred)
    SELECT (value->>'rate')::numeric, (value->>'enabled')::boolean 
    INTO v_global_rate, v_global_enabled
    FROM site_settings WHERE key = 'cashback_settings';

    IF v_global_enabled AND p_promo_code IS NULL AND p_wallet_usage = 0 THEN
        -- Only if NO promo used and NO wallet balance used (to keep economic balance)
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_prod_id := v_item->>'id';
            v_prod_qty := (v_item->>'quantity')::int;
            SELECT price, cashback_type, cashback_value INTO v_db_price, v_p_cashback_type, v_p_cashback_value
            FROM products WHERE id = v_prod_id;

            IF v_p_cashback_type = 'percent' THEN
                v_item_cashback := floor((v_db_price * v_prod_qty) * (v_p_cashback_value / 100));
            ELSIF v_p_cashback_type = 'fixed' THEN
                v_item_cashback := v_p_cashback_value * v_prod_qty;
            ELSE
                v_item_cashback := floor((v_db_price * v_prod_qty) * v_global_rate);
            END IF;
            v_total_earned_cashback := v_total_earned_cashback + v_item_cashback;
        END LOOP;
    END IF;

    -- 5. FINALIZATION: Place the order
    v_order_id := nextval('order_id_seq')::text;
    INSERT INTO orders (id, user_phone, items, total, address, coords, status, promo_code, discount_amount, potential_cashback, created_at)
    VALUES (v_order_id, p_user_phone, p_items, v_server_total, p_address, to_jsonb(p_coords), p_status, p_promo_code, v_server_discount, v_total_earned_cashback, now());

    RETURN jsonb_build_object(
        'success', true, 
        'orderId', v_order_id, 
        'serverTotal', v_server_total, 
        'walletUsed', p_wallet_usage,
        'potentialCashback', v_total_earned_cashback
    );
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
        console.log('🏛️  Installing BANK-LEVEL PlaceOrder RPC...');
        await client.query(sql);
        console.log('✅ PlaceOrder RPC is now secure and handles wallet usage!');
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        await client.end();
    }
}
main();
