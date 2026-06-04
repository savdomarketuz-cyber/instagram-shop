require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

/**
 * affiliate_transactions jadvali kod kutgan sxemaga mos emas edi:
 *  - order_id bigint edi, lekin orders.id TEXT -> insert tip xatosi
 *  - user_id / product_id / order_stage ustunlari yo'q edi -> insert jim xato
 * Natijada ref-link sotuvlarida komissiya tranzaksiyalari umuman yozilmasdi.
 */
async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        const before = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name='affiliate_transactions' ORDER BY ordinal_position
        `);
        console.log('🔍 before:');
        console.table(before.rows);

        console.log('⚙️  order_id -> text ...');
        await client.query(`ALTER TABLE affiliate_transactions ALTER COLUMN order_id TYPE text USING order_id::text`);

        console.log('⚙️  Adding user_id / product_id / order_stage ...');
        await client.query(`
            ALTER TABLE affiliate_transactions
                ADD COLUMN IF NOT EXISTS user_id text,
                ADD COLUMN IF NOT EXISTS product_id text,
                ADD COLUMN IF NOT EXISTS order_stage text
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_aff_tx_user ON affiliate_transactions(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_aff_tx_order ON affiliate_transactions(order_id)`);

        const after = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name='affiliate_transactions' ORDER BY ordinal_position
        `);
        console.log('\n✅ after:');
        console.table(after.rows);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}
main();
