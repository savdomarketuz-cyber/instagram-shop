const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Bazaga ulandi. Migratsiya boshlanmoqda...");

        // 1. token_version ustunini qo'shish
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;
        `);
        console.log("SUCCESS: 'token_version' ustuni muvaffaqiyatli qo'shildi.");

    } catch (err) {
        console.error("XATOLIK:", err.message);
    } finally {
        await client.end();
    }
}

migrate();
