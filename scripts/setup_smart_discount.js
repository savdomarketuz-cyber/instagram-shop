require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

/**
 * Smart chegirma tizimi — DB qatlami (#40).
 * Faqat ADDITIV: yangi jadvallar yaratadi, mavjud ma'lumotlarga tegmaydi.
 *
 *  - smart_discount_config : yagona qatorli global konfiguratsiya (admin boshqaradi)
 *  - smart_discount_offers : har bir taklif = bitta qaror auditi (kim/qaysi mahsulot/qancha %/qaysi signal/qachon)
 */
const sql = `
CREATE TABLE IF NOT EXISTS smart_discount_config (
    id text PRIMARY KEY DEFAULT 'global',
    enabled boolean NOT NULL DEFAULT false,
    min_percent integer NOT NULL DEFAULT 3,
    max_percent integer NOT NULL DEFAULT 10,
    intent_threshold numeric NOT NULL DEFAULT 0.45,
    offer_ttl_hours integer NOT NULL DEFAULT 48,
    cooldown_hours integer NOT NULL DEFAULT 168,
    max_active_offers_per_user integer NOT NULL DEFAULT 3,
    excluded_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    excluded_category_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT smart_discount_single_row CHECK (id = 'global')
);

-- Boshlang'ich (o'chiq) konfiguratsiya — agar yo'q bo'lsa
INSERT INTO smart_discount_config (id) VALUES ('global')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS smart_discount_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_identifier text NOT NULL,
    product_id text REFERENCES products(id) ON DELETE CASCADE,
    percent integer NOT NULL,
    intent_score numeric NOT NULL,
    signals jsonb NOT NULL DEFAULT '{}'::jsonb,   -- qaysi signallar qarorга turtki bo'ldi
    reason_uz text,
    reason_ru text,
    status text NOT NULL DEFAULT 'active',          -- active | redeemed | expired | revoked
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    redeemed_at timestamptz,
    revoked_by text,                                -- admin manual bekor qilsa
    order_id text                                   -- redeem bo'lganda qaysi buyurtmada
);

CREATE INDEX IF NOT EXISTS idx_sd_offers_user ON smart_discount_offers(user_identifier);
CREATE INDEX IF NOT EXISTS idx_sd_offers_product ON smart_discount_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_sd_offers_status ON smart_discount_offers(status);
CREATE INDEX IF NOT EXISTS idx_sd_offers_user_product ON smart_discount_offers(user_identifier, product_id);
CREATE INDEX IF NOT EXISTS idx_sd_offers_created ON smart_discount_offers(created_at DESC);

-- RLS: client to'g'ridan-to'g'ri yoza olmasin (faqat service role orqali)
ALTER TABLE smart_discount_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_discount_offers ENABLE ROW LEVEL SECURITY;
`;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('Connected to DB');
        await client.query(sql);
        const { rows } = await client.query("SELECT * FROM smart_discount_config WHERE id='global'");
        console.log('✅ Smart discount schema created. Config row:', rows[0]);
    } catch (err) {
        console.error('❌ DB Setup Error:', err);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

main();
