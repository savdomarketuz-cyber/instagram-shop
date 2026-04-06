require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('🏦 Locking the Iron Bank: Deploying Admin Security Infrastructure...');

        // 1. Audit Table (The Blackboard of Truth)
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_audit_logs (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                admin_phone TEXT,
                action TEXT,
                target TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // 2. Security Traps (Brute Force Defense)
        await client.query(`
            CREATE TABLE IF NOT EXISTS security_traps (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                ip_address TEXT UNIQUE,
                attempts INTEGER DEFAULT 0,
                is_blocked BOOLEAN DEFAULT FALSE,
                last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // 3. User Table Enhancements (Vault Settings)
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_vault_locked BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS admin_secret_key TEXT,
            ADD COLUMN IF NOT EXISTS last_admin_login TIMESTAMP WITH TIME ZONE;
        `);

        console.log('✅ Iron Bank Infrastructure DEPLOYED!');
    } catch (err) {
        console.error('❌ SQL Error:', err.message);
    } finally {
        await client.end();
    }
}
main();
