-- 1. Wallet Transactions (Audit Log)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'transfer_in', 'transfer_out', 'order_payment', 'refund', 'cashback'
    amount NUMERIC(20, 2) NOT NULL,
    peer_id UUID REFERENCES auth.users(id), -- P2P uchun qarshi tomon IDsi
    description TEXT,
    reference_id TEXT, -- Order ID yoki Transfer ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Wallet OTP Storage
CREATE TABLE IF NOT EXISTS wallet_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    code TEXT NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    receiver_id UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Atomic P2P Transfer Function (BANK LEVEL)
CREATE OR REPLACE FUNCTION process_p2p_transfer(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount NUMERIC,
    p_otp_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_balance NUMERIC;
    v_otp_valid BOOLEAN;
BEGIN
    -- 1. Check OTP validity and amount
    SELECT EXISTS (
        SELECT 1 FROM wallet_otps 
        WHERE user_id = p_sender_id 
        AND code = p_otp_code 
        AND receiver_id = p_receiver_id 
        AND amount = p_amount 
        AND expires_at > NOW() 
        AND is_used = FALSE
    ) INTO v_otp_valid;

    IF NOT v_otp_valid THEN
        RETURN jsonb_build_object('success', false, 'error', 'Noto''g''ri yoki muddati o''tgan tasdiqlash kodi');
    END IF;

    -- 2. Check Sender Balance with ROW LOCK (Race condition prevent)
    SELECT balance INTO v_sender_balance FROM user_wallets WHERE user_id = p_sender_id FOR UPDATE;
    
    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mablag'' yetarli emas');
    END IF;

    -- 3. START TRANSACTION (Deduce/Add)
    -- Deduce from sender
    UPDATE user_wallets SET balance = balance - p_amount WHERE user_id = p_sender_id;
    
    -- Add to receiver
    UPDATE user_wallets SET balance = balance + p_amount WHERE user_id = p_receiver_id;

    -- 4. Mark OTP as used
    UPDATE wallet_otps SET is_used = TRUE WHERE user_id = p_sender_id AND code = p_otp_code;

    -- 5. Create Audit Logs
    INSERT INTO wallet_transactions (user_id, type, amount, peer_id, description)
    VALUES (p_sender_id, 'transfer_out', p_amount, p_receiver_id, 'P2P chiqim');

    INSERT INTO wallet_transactions (user_id, type, amount, peer_id, description)
    VALUES (p_receiver_id, 'transfer_in', p_amount, p_sender_id, 'P2P kirim');

    RETURN jsonb_build_object('success', true, 'new_balance', (v_sender_balance - p_amount));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ichki xatolik: ' || SQLERRM);
END;
$$;
