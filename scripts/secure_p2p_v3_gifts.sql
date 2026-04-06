-- 1. Update OTP storage to support Gifting
ALTER TABLE p2p_otps ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE;

-- 2. Update the Atomic P2P Transfer Function (V3 with Gifting support)
CREATE OR REPLACE FUNCTION process_p2p_transfer_v3(
    p_sender_phone TEXT,
    p_receiver_phone TEXT,
    p_amount NUMERIC,
    p_otp_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_balance NUMERIC;
    v_receiver_exists BOOLEAN;
    v_otp_valid BOOLEAN;
    v_is_gift BOOLEAN;
BEGIN
    -- 1. Check OTP validity and get is_gift status
    SELECT is_gift INTO v_is_gift 
    FROM p2p_otps 
    WHERE sender_phone = p_sender_phone 
    AND code = p_otp_code 
    AND receiver_phone = p_receiver_phone 
    AND amount = p_amount 
    AND expires_at > NOW() 
    AND is_used = FALSE;

    IF v_is_gift IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tasdiqlash kodi noto''g''ri yoki muddati o''tgan');
    END IF;

    -- 2. Check Receiver Existence
    SELECT EXISTS (SELECT 1 FROM user_wallets WHERE user_phone = p_receiver_phone) INTO v_receiver_exists;
    IF NOT v_receiver_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Qabul qiluvchi hamyoni topilmadi');
    END IF;

    -- 3. Lock Sender Wallet
    SELECT balance INTO v_sender_balance FROM user_wallets WHERE user_phone = p_sender_phone FOR UPDATE;
    
    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mablag'' yetarli emas');
    END IF;

    -- 4. ATOMIC MOVE
    UPDATE user_wallets SET balance = balance - p_amount WHERE user_phone = p_sender_phone;
    UPDATE user_wallets SET balance = balance + p_amount WHERE user_phone = p_receiver_phone;

    -- 5. Mark OTP as used
    UPDATE p2p_otps SET is_used = TRUE WHERE sender_phone = p_sender_phone AND code = p_otp_code;

    -- 6. Audit Logs with Gifting Distinction
    INSERT INTO cashback_transactions (user_phone, amount, type, description)
    VALUES (
        p_sender_phone, 
        -p_amount, 
        CASE WHEN v_is_gift THEN 'p2p_gift_out' ELSE 'p2p_transfer_out' END, 
        CASE WHEN v_is_gift THEN 'Sovg''a: ' ELSE 'O''tkazma: ' END || p_receiver_phone
    );

    INSERT INTO cashback_transactions (user_phone, amount, type, description)
    VALUES (
        p_receiver_phone, 
        p_amount, 
        CASE WHEN v_is_gift THEN 'p2p_gift_in' ELSE 'p2p_transfer_in' END, 
        CASE WHEN v_is_gift THEN '🎁 Sizga sovg''a yuborildi: ' ELSE 'Kirim: ' END || p_sender_phone
    );

    RETURN jsonb_build_object('success', true, 'new_balance', (v_sender_balance - p_amount), 'is_gift', v_is_gift);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Xatolik: ' || SQLERRM);
END;
$$;
