require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('📡 Merging chats safely...');

        const { rows: allChats } = await client.query('SELECT * FROM private_chats');
        
        for (const chat of allChats) {
            const cleanParticipants = chat.participants.map(p => p.replace(/[^0-9]/g, ''));
            const newId = [...cleanParticipants].sort().join('_');

            if (chat.id !== newId) {
                console.log(`Processing: ${chat.id} -> ${newId}`);
                
                // 1. Ensure new chat exists
                await client.query(`
                    INSERT INTO private_chats (id, participants, last_message, last_timestamp, unread_count, participant_data)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (id) DO NOTHING
                `, [newId, cleanParticipants, chat.last_message, chat.last_timestamp, chat.unread_count, chat.participant_data]);

                // 2. Transfer messages
                await client.query('UPDATE private_messages SET chat_id = $1 WHERE chat_id = $2', [newId, chat.id]);

                // 3. Update new chat metadata if this was the later one
                await client.query(`
                    UPDATE private_chats 
                    SET last_message = $1, last_timestamp = $2 
                    WHERE id = $3 AND (last_timestamp IS NULL OR last_timestamp < $4)
                `, [chat.last_message, chat.last_timestamp, newId, chat.last_timestamp]);

                // 4. Delete old
                await client.query('DELETE FROM private_chats WHERE id = $1', [chat.id]);
            }
        }

        console.log('✅ Success! Database is unified and sanitized.');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
    } finally {
        await client.end();
    }
}
main();
