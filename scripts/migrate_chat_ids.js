require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('📡 Merging duplicate chats and cleaning IDs...');

        const { rows: allChats } = await client.query('SELECT * FROM private_chats');
        
        for (const chat of allChats) {
            // Clean participants
            const cleanParticipants = chat.participants.map(p => p.replace(/[^0-9]/g, ''));
            const newId = [...cleanParticipants].sort().join('_');

            if (chat.id !== newId) {
                console.log(`Merging ${chat.id} -> ${newId}`);
                
                // 1. Update messages to use new ID
                await client.query('UPDATE private_messages SET chat_id = $1 WHERE chat_id = $2', [newId, chat.id]);

                // 2. Insert new chat header if not exists, or merge last_message
                await client.query(`
                    INSERT INTO private_chats (id, participants, last_message, last_timestamp, unread_count, participant_data)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (id) DO UPDATE SET 
                        last_message = EXCLUDED.last_message,
                        last_timestamp = EXCLUDED.last_timestamp,
                        unread_count = EXCLUDED.unread_count,
                        participant_data = EXCLUDED.participant_data
                `, [newId, cleanParticipants, chat.last_message, chat.last_timestamp, chat.unread_count, chat.participant_data]);

                // 3. Delete old chat header
                await client.query('DELETE FROM private_chats WHERE id = $1', [chat.id]);
            }
        }

        // Also clean IDs in user_wallets and users if needed for consistency?
        // Let's stick to chat tables for now.

        console.log('✅ Chat migration completed: Database is now sanitized and unified!');
    } catch (err) {
        console.error('❌ Migration error:', err);
    } finally {
        await client.end();
    }
}
main();
