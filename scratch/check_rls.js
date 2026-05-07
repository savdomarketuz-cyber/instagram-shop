const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkRLS() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const result = await client.query(`
        SELECT relname AS table_name, relrowsecurity AS rls_enabled
        FROM pg_class
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
        WHERE pg_namespace.nspname = 'public' 
        AND relkind = 'r'
        ORDER BY relname;
    `);

    const policies = await client.query(`
        SELECT tablename, policyname, cmd, roles 
        FROM pg_policies 
        WHERE schemaname = 'public';
    `);

    console.log("=== RLS STATUS ===");
    result.rows.forEach(t => {
        const p = policies.rows.filter(x => x.tablename === t.table_name);
        console.log(`[${t.rls_enabled ? '✅' : '❌'}] ${t.table_name} (${p.length} policies)`);
    });

    await client.end();
}

checkRLS().catch(e => console.log(e.message));
