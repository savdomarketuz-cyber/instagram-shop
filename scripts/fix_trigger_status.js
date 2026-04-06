require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 3. FIX: Update Trigger to award/revoke cashback on status change (USE UZBEK STRINGS)
CREATE OR REPLACE FUNCTION handle_order_cashback_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- AWARD: If status changes TO 'Yetkazildi'
  IF (OLD.status IS NULL OR OLD.status != 'Yetkazildi') AND NEW.status = 'Yetkazildi' THEN
    IF NEW.potential_cashback > 0 THEN
      UPDATE user_wallets 
      SET balance = balance + NEW.potential_cashback, 
          updated_at = now() 
      WHERE user_phone = NEW.user_phone;

      INSERT INTO cashback_transactions (user_phone, order_id, amount, type, description)
      VALUES (NEW.user_phone, NEW.id, NEW.potential_cashback, 'earned', 'Buyurtma yetkazilgani uchun cashback');
      
      -- Clear potential
      NEW.potential_cashback := 0;
    END IF;
  END IF;

  -- REVOKE: If status changes FROM 'Yetkazildi' to 'Bekor qilingan' (Return logic)
  IF OLD.status = 'Yetkazildi' AND NEW.status = 'Bekor qilingan' THEN
    IF EXISTS (SELECT 1 FROM cashback_transactions WHERE order_id = NEW.id AND type = 'earned') THEN
       -- Check the actual earned amount from transactions
       DECLARE
          v_earned numeric;
       BEGIN
          SELECT amount INTO v_earned FROM cashback_transactions WHERE order_id = NEW.id AND type = 'earned' LIMIT 1;
          
          UPDATE user_wallets 
          SET balance = balance - v_earned, 
              updated_at = now() 
          WHERE user_phone = NEW.user_phone;

          INSERT INTO cashback_transactions (user_phone, order_id, amount, type, description)
          VALUES (NEW.user_phone, NEW.id, -v_earned, 'penalty', 'Yetkazilgan buyurtma bekor qilingani uchun cashback qaytarib olindi');
       END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_cashback_status_change ON orders;
CREATE TRIGGER trg_order_cashback_status_change
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_order_cashback_status_change();
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('🔗 Connected to database for trigger FIX migration...');
    await client.query(sql);
    console.log('✅ Trigger updated to use Uzbek status strings (Yetkazildi / Bekor qilingan)!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}
main();
