-- 1. Wallet OTP Storage (Phone based)
CREATE TABLE IF NOT EXISTS p2p_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_phone TEXT NOT NULL,
    receiver_phone TEXT NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Atomic P2P Transfer Function (Phone based)
CREATE OR REPLACE FUNCTION process_p2p_transfer_v2(
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
BEGIN
    -- 1. Check OTP validity
    SELECT EXISTS (
        SELECT 1 FROM p2p_otps 
        WHERE sender_phone = p_sender_phone 
        AND code = p_otp_code 
        AND receiver_phone = p_receiver_phone 
        AND amount = p_amount 
        AND expires_at > NOW() 
        AND is_used = FALSE
    ) INTO v_otp_valid;

    IF NOT v_otp_valid THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tasdiqlash kodi noto''g''ri yoki muddati o''tgan');
    END IF;

    -- 2. Check Receiver Existence
    SELECT EXISTS (SELECT 1 FROM user_wallets WHERE user_phone = p_receiver_phone) INTO v_receiver_exists;
    IF NOT v_receiver_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Qabul qiluvchi hamyoni topilmadi');
    END IF;

    -- 3. Lock Sender Wallet for Update
    SELECT balance INTO v_sender_balance FROM user_wallets WHERE user_phone = p_sender_phone FOR UPDATE;
    
    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mablag'' yetarli emas');
    END IF;

    -- 4. ATOMIC MOVE
    -- Deduce from sender
    UPDATE user_wallets SET balance = balance - p_amount WHERE user_phone = p_sender_phone;
    
    -- Add to receiver
    UPDATE user_wallets SET balance = balance + p_amount WHERE user_phone = p_receiver_phone;

    -- 5. Mark OTP as used
    UPDATE p2p_otps SET is_used = TRUE WHERE sender_phone = p_sender_phone AND code = p_otp_code;

    -- 6. Audit Logs (Using existing cashback_transactions pattern)
    INSERT INTO cashback_transactions (user_phone, amount, type, description)
    VALUES (p_sender_phone, -p_amount, 'p2p_transfer_out', 'O''tkazma: ' || p_receiver_phone);

    INSERT INTO cashback_transactions (user_phone, amount, type, description)
    VALUES (p_receiver_phone, p_amount, 'p2p_transfer_in', 'Kirim: ' || p_sender_phone);

    RETURN jsonb_build_object('success', true, 'new_balance', (v_sender_balance - p_amount));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Xatolik: ' || SQLERRM);
END;
$$;
