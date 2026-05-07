const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // visitor_logs jadvalining ustunlarini tekshirish
    const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'visitor_logs' 
        ORDER BY ordinal_position
    `);

    if (result.rows.length === 0) {
        console.log("❌ visitor_logs jadvali topilmadi!");
    } else {
        console.log("✅ visitor_logs jadvali mavjud. Ustunlar:");
        result.rows.forEach(row => {
            console.log(`   - ${row.column_name} (${row.data_type})`);
        });
    }

    // Qancha log yozuvi borligini tekshirish
    const count = await client.query(`SELECT COUNT(*) FROM visitor_logs`);
    console.log(`\n📊 Jami log yozuvlari: ${count.rows[0].count} ta`);

    await client.end();
}

check().catch(e => console.error("XATO:", e.message));
