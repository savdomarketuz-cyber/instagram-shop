import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl } from './get_db_url.mjs';

const url = getDatabaseUrl();
const sql = fs.readFileSync('scripts/create_suggest_rpc.sql', 'utf8');

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to DB. Creating suggest_products RPC...');
    await client.query(sql);
    console.log('✅ suggest_products RPC created successfully!');

    // Test suggest_products
    const start = Date.now();
    const r = await client.query("SELECT id, name, price, model FROM suggest_products('air', 6)");
    const latency = Date.now() - start;
    console.log(`✅ suggest_products('air', 6) returned ${r.rows.length} rows in ${latency}ms:`);
    r.rows.forEach(p => console.log(`   - ${p.name?.slice(0, 45)} | ${p.price}`));

  } catch (err) {
    console.error('❌ Failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
