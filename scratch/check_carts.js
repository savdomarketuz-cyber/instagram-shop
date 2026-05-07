const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkCartsTable() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'active_carts' 
        ORDER BY ordinal_position
    `);

    console.log("active_carts jadvali ustunlari:");
    result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    await client.end();
}

checkCartsTable().catch(e => console.error("XATO:", e.message));
