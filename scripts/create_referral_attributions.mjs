import { readFileSync } from 'fs';
import pg from 'pg';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

const sql = `
CREATE TABLE IF NOT EXISTS referral_attributions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone text NOT NULL,
    product_id text NOT NULL,
    slug text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_phone, product_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_attr_user ON referral_attributions (user_phone);

-- 30 kundan eski atributsiyalarni tozalash uchun (ixtiyoriy, cron'da chaqirish mumkin)
COMMENT ON TABLE referral_attributions IS 'Last-click affiliate attribution, foydalanuvchi hisobiga bog''langan (cross-device)';
`;

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
    await c.query(sql);
    console.log('✅ referral_attributions jadvali yaratildi (last-click, cross-device)');
    const t = await c.query("SELECT to_regclass('public.referral_attributions') as tbl");
    console.log('   Tasdiq:', t.rows[0].tbl);
} catch (e) {
    console.error('❌ XATO:', e.message);
} finally {
    await c.end();
}
