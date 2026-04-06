require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('📡 Enabling Real-time for all chat tables...');
        
        // Ensure private_messages is in the supabase_realtime publication
        // First check if it already exists to avoid errors
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_publication_tables 
                    WHERE pubname = 'supabase_realtime' AND tablename = 'private_messages'
                ) THEN
                    ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_publication_tables 
                    WHERE pubname = 'supabase_realtime' AND tablename = 'private_chats'
                ) THEN
                    ALTER PUBLICATION supabase_realtime ADD TABLE private_chats;
                END IF;
            END $$;
        `);

        console.log('✅ Real-time replication successfully enabled for messaging!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}
main();
