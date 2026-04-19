import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function applyRatingFix() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'rating_trigger.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    await client.connect();
    console.log('🔗 Database-ga ulanish o\'rnatildi...');
    
    await client.query(sql);
    console.log('✅ REYTING HIMOYA TIZIMI (Rating Trigger) muvaffaqiyatli qo\'llanildi!');
    console.log('🛡 Endi reytinglar avtomatik va xavfsiz hisoblanadi.');

  } catch (err) {
    console.error('❌ Xatolik yuz berdi:', err);
  } finally {
    await client.end();
  }
}

applyRatingFix();
