const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Bazaga ulandi. Migratsiya boshlanmoqda...");

        // 1. users jadvaliga token_version
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;
        `);
        console.log("✅ 'token_version' (users) qo'shildi.");

        // 2. user_status jadvaliga qurilma va geo ustunlari
        await client.query(`
            ALTER TABLE user_status 
            ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
            ADD COLUMN IF NOT EXISTS device_type TEXT,
            ADD COLUMN IF NOT EXISTS device_memory NUMERIC,
            ADD COLUMN IF NOT EXISTS cpu_cores INTEGER,
            ADD COLUMN IF NOT EXISTS city TEXT,
            ADD COLUMN IF NOT EXISTS region TEXT,
            ADD COLUMN IF NOT EXISTS country TEXT,
            ADD COLUMN IF NOT EXISTS isp TEXT,
            ADD COLUMN IF NOT EXISTS latitude NUMERIC,
            ADD COLUMN IF NOT EXISTS longitude NUMERIC;
        `);
        console.log("✅ 'user_status' yangi ustunlari qo'shildi.");

        // 3. visitor_logs jadvali — kirdi-chiqdi jurnali
        await client.query(`
            CREATE TABLE IF NOT EXISTS visitor_logs (
                id          BIGSERIAL PRIMARY KEY,
                session_id  TEXT,
                user_phone  TEXT,
                name        TEXT DEFAULT 'Mehmon',
                event_type  TEXT NOT NULL,   -- 'login' | 'logout' | 'visit' | 'register'
                ip_address  TEXT,
                city        TEXT,
                region      TEXT,
                country     TEXT,
                isp         TEXT,
                latitude    NUMERIC,
                longitude   NUMERIC,
                device_type TEXT,
                screen_resolution TEXT,
                device_memory     NUMERIC,
                cpu_cores         INTEGER,
                current_path      TEXT,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log("✅ 'visitor_logs' jadvali yaratildi.");

        // 4. Indeks — tez qidirish uchun
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_visitor_logs_created 
            ON visitor_logs (created_at DESC);
            
            CREATE INDEX IF NOT EXISTS idx_visitor_logs_user_phone 
            ON visitor_logs (user_phone);
        `);
        console.log("✅ Indekslar qo'shildi.");

    } catch (err) {
        console.error("❌ XATOLIK:", err.message);
    } finally {
        await client.end();
        console.log("\nMigratsiya yakunlandi.");
    }
}

migrate();
