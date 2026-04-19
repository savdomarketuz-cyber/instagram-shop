-- Security Upgrade: P2P Transfer Brute-Force Protection
-- 1. Add attempts tracking to OTP table
ALTER TABLE p2p_otps ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

-- 2. Update the P2P Transfer function to V4 with security limits
CREATE OR REPLACE FUNCTION process_p2p_transfer_v4(
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
    v_otp RECORD;
    v_sender_balance NUMERIC;
    v_receiver_exists BOOLEAN;
BEGIN
    -- 0. USER VALIDATION: Check if sender or receiver is banned
    IF EXISTS (SELECT 1 FROM users WHERE phone IN (p_sender_phone, p_receiver_phone) AND (banned_until > now() OR deleted_at IS NOT NULL)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ushbu operatsiyada ishtirok etayotgan foydalanuvchilardan biri bloklangan.');
    END IF;

    -- 1. Fetch the OTP record for this specific sender
    SELECT * INTO v_otp 
    FROM p2p_otps 
    WHERE sender_phone = p_sender_phone 
    AND is_used = FALSE 
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tasdiqlash kodi topilmadi yoki muddati o''tgan');
    END IF;

    -- 2. Check for brute force (max 5 attempts)
    IF v_otp.attempts >= 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Urinishlar soni tugadi. Iltimos, yangi kod so''rang.');
    END IF;

    -- 3. Validate code and details
    IF v_otp.code != p_otp_code OR v_otp.receiver_phone != p_receiver_phone OR v_otp.amount != p_amount THEN
        -- Increment attempts
        UPDATE p2p_otps SET attempts = attempts + 1 WHERE id = v_otp.id;
        RETURN jsonb_build_object('success', false, 'error', 'Ma''lumotlar yoki kod noto''g''ri. Qolgan urinishlar: ' || (4 - v_otp.attempts));
    END IF;

    -- 4. Check Receiver Existence
    SELECT EXISTS (SELECT 1 FROM user_wallets WHERE user_phone = p_receiver_phone) INTO v_receiver_exists;
    IF NOT v_receiver_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Qabul qiluvchi hamyoni topilmadi');
    END IF;

    -- 5. Lock Sender Wallet
    SELECT balance INTO v_sender_balance FROM user_wallets WHERE user_phone = p_sender_phone FOR UPDATE;
    
    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mablag'' yetarli emas');
    END IF;

    -- 6. ATOMIC MOVE
    UPDATE user_wallets SET balance = balance - p_amount WHERE user_phone = p_sender_phone;
    UPDATE user_wallets SET balance = balance + p_amount WHERE user_phone = p_receiver_phone;

    -- 7. Mark OTP as used
    UPDATE p2p_otps SET is_used = TRUE WHERE id = v_otp.id;

    -- 8. Audit Logs
    INSERT INTO cashback_transactions (user_phone, amount, type, description)
    VALUES (p_sender_phone, -p_amount, CASE WHEN v_otp.is_gift THEN 'p2p_gift_out' ELSE 'p2p_transfer_out' END, CASE WHEN v_otp.is_gift THEN 'Sovg''a: ' ELSE 'O''tkazma: ' END || p_receiver_phone);

    INSERT INTO cashback_transactions (user_phone, amount, type, description)
    VALUES (p_receiver_phone, p_amount, CASE WHEN v_otp.is_gift THEN 'p2p_gift_in' ELSE 'p2p_transfer_in' END, CASE WHEN v_otp.is_gift THEN '🎁 Sizga sovg''a: ' ELSE 'Kirim: ' END || p_sender_phone);

    RETURN jsonb_build_object('success', true, 'new_balance', (v_sender_balance - p_amount), 'is_gift', v_otp.is_gift);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Xatolik: ' || SQLERRM);
END;
$$;
