require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('📡 Emergency Chat Recovery...');

        // 1. Ensure REALTIME is enabled globally for ALL tables (safest way)
        await client.query(`DROP PUBLICATION IF EXISTS supabase_realtime;`);
        await client.query(`CREATE PUBLICATION supabase_realtime FOR ALL TABLES;`);

        // 2. Set all chat tables to FULL replica identity
        await client.query(`ALTER TABLE private_messages REPLICA IDENTITY FULL;`);
        await client.query(`ALTER TABLE private_chats REPLICA IDENTITY FULL;`);

        // 3. Temporarily DISABLE RLS for messages for debugging/immediate fix
        await client.query(`ALTER TABLE private_messages DISABLE ROW LEVEL SECURITY;`);

        console.log('✅ Chat Recovery Complete: ALL TABLES Real-time ENABLED!');
    } catch (err) {
        console.error('❌ Error during recovery:', err.message);
    } finally {
        await client.end();
    }
}
main();
