require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('🔍 USERS TABLE COLUMNS:');
        const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
        console.table(cols.rows.map(c => c.column_name));

        console.log('\n🔍 LISTING ALL USERS:');
        const users = await client.query(`SELECT * FROM users LIMIT 10`);
        console.table(users.rows);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}
main();
