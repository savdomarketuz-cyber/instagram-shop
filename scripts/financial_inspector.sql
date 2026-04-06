-- 1. GLobal Financial Reconciliation Function
-- This function verifies that current balances match the sum of all historical transactions
CREATE OR REPLACE FUNCTION get_global_wallet_audit()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_wallets_balance NUMERIC;
    v_total_transactions_sum NUMERIC;
    v_inconsistent_wallets JSONB;
BEGIN
    -- Calculate total balance across all wallets
    SELECT COALESCE(SUM(balance), 0) INTO v_total_wallets_balance FROM user_wallets;

    -- Calculate total sum from all audit logs (cashback_transactions)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_transactions_sum FROM cashback_transactions;

    -- Find any specific wallets that don't match their transaction history
    SELECT jsonb_agg(row_to_json(t))
    INTO v_inconsistent_wallets
    FROM (
        SELECT 
            w.user_phone, 
            w.balance as current_balance, 
            COALESCE(SUM(ct.amount), 0) as history_sum,
            (w.balance - COALESCE(SUM(ct.amount), 0)) as discrepancy
        FROM user_wallets w
        LEFT JOIN cashback_transactions ct ON w.user_phone = ct.user_phone
        GROUP BY w.user_phone, w.balance
        HAVING ABS(w.balance - COALESCE(SUM(ct.amount), 0)) > 0.01 -- Check if difference is more than 0.01
    ) t;

    RETURN jsonb_build_object(
        'total_wallets_balance', v_total_wallets_balance,
        'total_transactions_sum', v_total_transactions_sum,
        'is_system_balanced', ABS(v_total_wallets_balance - v_total_transactions_sum) < 0.01,
        'global_discrepancy', (v_total_wallets_balance - v_total_transactions_sum),
        'inconsistent_count', COALESCE(jsonb_array_length(v_inconsistent_wallets), 0),
        'inconsistent_wallets', v_inconsistent_wallets,
        'checked_at', NOW()
    );
END;
$$;
