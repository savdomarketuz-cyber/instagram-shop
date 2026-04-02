require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('👥 Adding Zebo user for testing...');
        
        await client.query(`
            INSERT INTO users (id, name, phone, username, password, created_at)
            VALUES ('user_zebo_test_1', 'Zebiniso Raximova', '+998909998877', 'zeboraximova_', 'welcome123', now())
            ON CONFLICT (phone) DO UPDATE SET name = 'Zebiniso Raximova', username = 'zeboraximova_'
        `);

        await client.query(`
            INSERT INTO user_wallets (user_phone, wallet_number, balance)
            VALUES ('+998909998877', '8600' || floor(random() * 1000000000000)::text, 12000)
            ON CONFLICT (user_phone) DO NOTHING
        `);

        console.log('✅ Zebo (Zebiniso Raximova) successfully added for test!');
        
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        await client.end();
    }
}
main();
