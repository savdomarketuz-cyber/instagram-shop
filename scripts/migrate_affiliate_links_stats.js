require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        const before = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'affiliate_links'
        `);
        console.log('🔍 affiliate_links columns (before):');
        console.table(before.rows.map(c => c.column_name));

        console.log('\n⚙️  Adding clicks / conversions columns (if missing)...');
        await client.query(`
            ALTER TABLE affiliate_links
                ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS conversions integer NOT NULL DEFAULT 0
        `);

        const after = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'affiliate_links'
        `);
        console.log('\n✅ affiliate_links columns (after):');
        console.table(after.rows.map(c => c.column_name));
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}
main();
