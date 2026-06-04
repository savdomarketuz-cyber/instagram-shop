require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        console.log('⚙️  Adding products.express_delivery (if missing)...');
        await client.query(`
            ALTER TABLE public.products
              ADD COLUMN IF NOT EXISTS express_delivery boolean NOT NULL DEFAULT false
        `);

        console.log('⚙️  Adding orders.delivery_type / delivery_fee / delivery_eta (if missing)...');
        await client.query(`
            ALTER TABLE public.orders
              ADD COLUMN IF NOT EXISTS delivery_type text,
              ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS delivery_eta text
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_express_delivery
              ON public.products (express_delivery) WHERE express_delivery = true
        `);

        const r = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name='orders' AND column_name IN ('delivery_type','delivery_fee','delivery_eta')
            ORDER BY column_name
        `);
        console.log('\n✅ orders delivery columns:');
        console.table(r.rows.map(x => x.column_name));
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}
main();
