require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('🧹 Sanity Check: Cleaning Chat IDs in Database...');

        const cleanPhone = (p) => p.replace(/%2B/g, '+').replace(/[^0-9]/g, '');

        // 1. Fetch all chats to sanitize
        const { rows: chats } = await client.query('SELECT id, participants FROM private_chats');
        for (const chat of chats) {
            const newParticipants = chat.participants.map(p => p.replace(/[^0-9]/g, ''));
            const newId = newParticipants.sort().join('_');
            
            if (chat.id !== newId) {
                console.log(`Updating Chat ID: ${chat.id} -> ${newId}`);
                // Use a temporary variable to handle conflicts or just delete old duplicate if exists
                await client.query('UPDATE private_messages SET chat_id = $1 WHERE chat_id = $2', [newId, chat.id]);
                await client.query('UPDATE private_chats SET id = $1, participants = $2 WHERE id = $3', [newId, newParticipants, chat.id]);
            }
        }

        console.log('✅ Database Sanity Check Complete: All Chat IDs standardized (Numbers Only)!');
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        await client.end();
    }
}
main();
