const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTable() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'fcm_tokens'");
    console.log(res.rows);
    await client.end();
}
checkTable();
