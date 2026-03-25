const { Client } = require('pg');

const variants = [
    { name: "With brackets", pass: "[!f3$DRcmZT!aU@@]" },
    { name: "Without brackets", pass: "!f3$DRcmZT!aU@@" }
];

async function test(v) {
    const client = new Client({
        user: 'postgres.slmbethqqqugnktxwzdz',
        host: 'aws-1-ap-south-1.pooler.supabase.com',
        database: 'postgres',
        password: v.pass,
        port: 6543,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log(`✅ Success with: ${v.name}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ Failed with: ${v.name} - ${err.message}`);
        return false;
    }
}

async function main() {
    for (const v of variants) {
        if (await test(v)) break;
    }
}

main();
