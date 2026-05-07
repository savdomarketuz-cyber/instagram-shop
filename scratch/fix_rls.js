const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function enableRLS() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    console.log("Qolgan barcha jadvallar uchun RLS faollashtirilmoqda...");

    const tablesToSecure = [
        "active_carts", "ai_logs", "bot_sessions", "fcm_tokens", 
        "order_returns", "private_chats", "private_messages", 
        "search_analytics", "search_clicks", "search_synonyms", 
        "settings", "support_chats", "support_messages", 
        "user_affinity_profiles", "user_status", "user_telemetry_logs", 
        "visitor_logs", "wallet_transactions"
    ];

    try {
        for (const table of tablesToSecure) {
            // RLS ni yoqish
            await client.query(`ALTER TABLE IF EXISTS ${table} ENABLE ROW LEVEL SECURITY;`);
            
            // Xavfsiz siyosat (Policy)
            // Agar jadvallarga asosan API orqali murojaat qilinsa, ular umuman tashqariga chiqmasligi kerak.
            // Lekin ba'zi jadvallar frontend'ga anonim insert/select qilishga ruxsat berilishi kerak.
            
            if (["user_status", "search_analytics", "search_clicks", "user_telemetry_logs"].includes(table)) {
                // Tracking uchun anonim insert ruxsat (faqat yozish)
                await client.query(`
                    DROP POLICY IF EXISTS "Allow anon inserts" ON ${table};
                    CREATE POLICY "Allow anon inserts" ON ${table} FOR INSERT TO anon, authenticated WITH CHECK (true);
                `);
            } else if (["private_messages", "private_chats", "support_chats", "support_messages"].includes(table)) {
                // Chat tizimi - barchasi API orqali bo'lishi tavsiya etiladi. 
                // Xavfsizlik uchun qat'iy (faqat Admin aylanib o'tadi)
            }
        }
        console.log("✅ RLS muvaffaqiyatli yoqildi va himoyalandi.");
    } catch (err) {
        console.error("Xato:", err.message);
    } finally {
        await client.end();
    }
}

enableRLS();
