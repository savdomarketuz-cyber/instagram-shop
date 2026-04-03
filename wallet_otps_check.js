require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        
        console.log('🔍 WALLET_OTPS STRUCTURE:');
        const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wallet_otps'`);
        console.table(cols.rows);

        console.log('\n🔗 CONSTRAINTS (FOREIGN KEYS, ETC):');
        const fks = await client.query(`
            SELECT 
                conname as name, 
                pg_get_constraintdef(c.oid) as definition
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'wallet_otps'::regclass
        `);
        console.table(fks.rows);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}
main();
