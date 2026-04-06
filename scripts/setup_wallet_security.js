require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('🛡️ Deploying Bank-Level Wallet DB Infrastructure...');

        // 1. Audit Trail Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS wallet_transfers (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                sender_phone TEXT,
                receiver_phone TEXT,
                amount DECIMAL(15,2),
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                metadata JSONB
            );
        `);

        // 2. 2FA (OTP) Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS wallet_otps (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                phone TEXT,
                code TEXT,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // 3. ATOMIC P2P TRANSFER FUNCTION (The Heart of Security)
        // This handles locking (FOR UPDATE) to prevent race conditions.
        await client.query(`
            CREATE OR REPLACE FUNCTION p2p_transfer(
                sender_phone_val TEXT, 
                receiver_phone_val TEXT, 
                amount_val DECIMAL
            ) RETURNS jsonb AS $$
            DECLARE
                sender_balance DECIMAL;
                receiver_exists BOOLEAN;
            BEGIN
                -- 1. Lock Sender row (Prevent concurrent spend)
                SELECT balance INTO sender_balance FROM user_wallets WHERE phone = sender_phone_val FOR UPDATE;
                
                -- 2. Check Receiver existence
                SELECT EXISTS(SELECT 1 FROM user_wallets WHERE phone = receiver_phone_val) INTO receiver_exists;
                
                IF NOT receiver_exists THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Qabul qiluvchi topilmadi');
                END IF;

                -- 3. Check Balance
                IF sender_balance < amount_val THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Mablag yetarli emas');
                END IF;

                -- 4. Perform Transactions
                UPDATE user_wallets SET balance = balance - amount_val WHERE phone = sender_phone_val;
                UPDATE user_wallets SET balance = balance + amount_val WHERE phone = receiver_phone_val;

                -- 5. Audit Log
                INSERT INTO wallet_transfers (sender_phone, receiver_phone, amount, status) 
                VALUES (sender_phone_val, receiver_phone_val, amount_val, 'completed');

                RETURN jsonb_build_object('success', true, 'message', 'Otkazma muvaffaqiyatli yakunlandi');
            EXCEPTION WHEN OTHERS THEN
                RETURN jsonb_build_object('success', false, 'message', 'Tizimda xatolik: ' || SQLERRM);
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('✅ Bank-level Wallet infrastructure DEPLOYED!');
    } catch (err) {
        console.error('❌ SQL Error:', err.message);
    } finally {
        await client.end();
    }
}
main();
