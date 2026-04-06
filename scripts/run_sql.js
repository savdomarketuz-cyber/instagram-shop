const { Client } = require('pg');
const fs = require('fs');

async function main() {
    const client = new Client({
        connectionString: 'postgres://postgres.slmbethqqqugnktxwzdz:!f3$DRcmZT!aU@@@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    console.log("Connected to Supabase Postgres!");

    const sqlFile = process.argv[2];
    if (!sqlFile) {
        console.error("Please provide a SQL file path.");
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    try {
        console.log(`Executing ${sqlFile}...`);
        await client.query(sql);
        console.log("✅ SQL executed successfully!");
    } catch (err) {
        console.error("❌ SQL execution failed:", err);
    } finally {
        await client.end();
    }
}

main();
