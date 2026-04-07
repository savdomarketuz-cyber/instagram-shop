import pg from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL topilmadi!");
    return;
  }

  const client = new pg.Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Bazaga ulanish...");
    await client.connect();
    console.log("Ulanish muvaffaqiyatli!");

    console.log("Model ustunini qo'shish ketyapti...");
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT;');
    console.log("Ustun muvaffaqiyatli qo'shildi!");

  } catch (err: any) {
    console.error("Xatolik yuz berdi:", err.message);
  } finally {
    await client.end();
  }
}

migrate();
