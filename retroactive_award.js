require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('🔗 Connected to database for RETROACTIVE AWARD fix...');
    
    // Find orders that are 'Yetkazildi' but still have potential_cashback > 0
    const { rows: orders } = await client.query(`
      SELECT id, user_phone, potential_cashback 
      FROM orders 
      WHERE status = 'Yetkazildi' 
      AND potential_cashback > 0
    `);

    for (const order of orders) {
      console.log(`Processing Order: ${order.id}, User: ${order.user_phone}, Amount: ${order.potential_cashback}`);
      
      // 1. Ensure wallet exists (UPSERT)
      await client.query(`
        INSERT INTO user_wallets (user_phone, wallet_number, balance)
        VALUES ($1, 'RETRO-' || floor(random() * 1000000000)::text, 0)
        ON CONFLICT (user_phone) DO NOTHING
      `, [order.user_phone]);

      // 2. Award balance
      await client.query(`
        UPDATE user_wallets 
        SET balance = balance + $1, updated_at = now() 
        WHERE user_phone = $2
      `, [order.potential_cashback, order.user_phone]);

      // 3. Record transaction
      await client.query(`
        INSERT INTO cashback_transactions (user_phone, order_id, amount, type, description)
        VALUES ($1, $2, $3, 'earned', 'Muvaffaqiyatli yetkazish uchun cashback (Retro)')
      `, [order.user_phone, order.id, order.potential_cashback]);

      // 4. Clear potential_cashback from order
      await client.query(`
        UPDATE orders SET potential_cashback = 0 
        WHERE id = $1
      `, [order.id]);

      console.log(`✅ Success for order ${order.id}`);
    }

  } catch (err) {
    console.error('❌ Retroactive award failed:', err);
  } finally {
    await client.end();
  }
}
main();
