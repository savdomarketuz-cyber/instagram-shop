import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function applyWalletSecurity() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return console.error('❌ DATABASE_URL missing');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'wallet_security_upgrade.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    await client.connect();
    await client.query(sql);
    console.log('✅ WALLET SECURITY UPGRADE applied to DB (V4 with Attempt Limits)!');
  } catch (err) {
    console.error('❌ SQL Error:', err);
  } finally {
    await client.end();
  }
}

applyWalletSecurity();
