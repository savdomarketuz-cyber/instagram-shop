import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl } from './get_db_url.mjs';

const url = getDatabaseUrl();
const sql = fs.readFileSync('scripts/migrations/2026-10-product-params-multilang.sql', 'utf8');
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('🔌 Supabase bazasiga ulandi. Migratsiya yurgizilmoqda...');
    await client.query(sql);
    console.log('✅ 2026-10-product-params-multilang.sql muvaffaqiyatli bajarildi!');
    
    // Tekshiruv: Ustunlar mavjudligini tasdiqlash
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_param_values' 
        AND column_name IN ('value', 'value_uz', 'value_ru');
    `);
    console.log('📋 Mavjud ustunlar:', res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error('❌ Migratsiyada xatolik:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
