const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Bazaga ulandi. Migratsiya boshlanmoqda...");

        // 1. users jadvaliga token_version ustunini qo'shish
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;
        `);
        console.log("✅ 'token_version' ustuni (users) qo'shildi.");

        // 2. user_status jadvaliga yangi ustunlar qo'shish
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
        console.log("✅ 'user_status' jadvaliga yangi ustunlar qo'shildi:");
        console.log("   - screen_resolution (Ekran o'lchami)");
        console.log("   - device_type (Mobil/Desktop)");
        console.log("   - device_memory (RAM)");
        console.log("   - cpu_cores (Protsessor yadrolari)");
        console.log("   - city, region, country (Joylashuv)");
        console.log("   - isp (Internet provayder)");
        console.log("   - latitude, longitude (Koordinatalar)");

    } catch (err) {
        console.error("❌ XATOLIK:", err.message);
    } finally {
        await client.end();
        console.log("\nMigratsiya yakunlandi.");
    }
}

migrate();
