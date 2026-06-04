require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        console.log('⚙️  Creating promo_code_tariffs ...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS promo_code_tariffs (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                name text NOT NULL,
                type text NOT NULL DEFAULT 'fixed',                     -- 'fixed' | 'percentage'
                discount_value numeric NOT NULL DEFAULT 0,
                min_order_value numeric NOT NULL DEFAULT 0,
                affiliate_reward_type text NOT NULL DEFAULT 'fixed_per_use', -- fixed_per_use | percent_of_final_price | percent_of_discount
                affiliate_reward_value numeric NOT NULL DEFAULT 0,
                is_active boolean NOT NULL DEFAULT true,
                created_at timestamptz NOT NULL DEFAULT now()
            )
        `);

        console.log('⚙️  Creating affiliate_promo_codes ...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS affiliate_promo_codes (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                affiliate_id text NOT NULL,                              -- public.users.id (text); FK qo'yilmaydi (affiliate_links konvensiyasi)
                tariff_id uuid REFERENCES promo_code_tariffs(id) ON DELETE SET NULL,
                code text NOT NULL UNIQUE,
                title text,
                is_active boolean NOT NULL DEFAULT true,
                usage_limit integer,
                usage_count integer NOT NULL DEFAULT 0,
                total_earned numeric NOT NULL DEFAULT 0,
                created_at timestamptz NOT NULL DEFAULT now()
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_aff_promo_affiliate ON affiliate_promo_codes(affiliate_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_aff_promo_code ON affiliate_promo_codes(code)`);

        console.log('⚙️  Creating increment_promo_usage(p_promo_id, p_earned) RPC ...');
        await client.query(`
            CREATE OR REPLACE FUNCTION increment_promo_usage(p_promo_id uuid, p_earned numeric)
            RETURNS void
            LANGUAGE sql
            AS $$
                UPDATE affiliate_promo_codes
                SET usage_count = usage_count + 1,
                    total_earned = total_earned + COALESCE(p_earned, 0)
                WHERE id = p_promo_id;
            $$
        `);

        const check = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_name IN ('promo_code_tariffs','affiliate_promo_codes')
            ORDER BY table_name
        `);
        console.log('\n✅ Tables present:');
        console.table(check.rows.map(r => r.table_name));
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}
main();
