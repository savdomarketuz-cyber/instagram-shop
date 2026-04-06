require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('🔍 IRON BANK DIAGNOSTICS: (Audit + OTP + Traps)');

        // 1. Audit Logs (Recent attempts)
        const audit = await client.query('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 5');
        console.log('\n📜 LAST AUDIT LOGS:');
        console.table(audit.rows);

        // 2. Active OTP for Admin
        const otps = await client.query(`SELECT * FROM wallet_otps WHERE phone = 'ADMIN_VAULT'`);
        console.log('\n🔐 ACTIVE ADMIN OTP CODES:');
        console.table(otps.rows);

        // 3. Security Traps (IP blocking)
        const traps = await client.query('SELECT * FROM security_traps');
        console.log('\n🪤 ACTIVE SECURITY TRAPS (BLOCKED IPs):');
        console.table(traps.rows);

        // 4. Admin Secret check (Basic)
        const admins = await client.query("SELECT phone, name, is_vault_locked FROM users WHERE phone = 'admin' OR phone LIKE '%admin%'");
        console.log('\n👤 ADMIN STATUS CHECK:');
        console.table(admins.rows);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}
main();
