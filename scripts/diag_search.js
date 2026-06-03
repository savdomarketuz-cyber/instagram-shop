require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const q = async (label, sql, params=[]) => {
    try { const r = await c.query(sql, params); console.log(`\n=== ${label} ===`); console.table(r.rows); }
    catch(e){ console.log(`\n=== ${label} ERROR: ${e.message}`); }
  };

  // 1. "Pods Max" mahsuloti bormi?
  await q('Pods Max nomli mahsulotlar', `
    SELECT id, name FROM products
    WHERE is_deleted=false AND (name ILIKE '%pods%' OR name_uz ILIKE '%pods%' OR name_ru ILIKE '%pods%')
    LIMIT 10`);

  // 2. "airpods max" similarity qiymatlari (eng yaqin 8 ta)
  await q('similarity(name, "airpods max")', `
    SELECT name,
      round(similarity(name,'airpods max')::numeric,3) AS sim_whole,
      round(word_similarity('airpods max', name)::numeric,3) AS wordsim,
      round(word_similarity('airpods', name)::numeric,3) AS wordsim_airpods,
      round(word_similarity('pods', name)::numeric,3) AS wordsim_pods
    FROM products WHERE is_deleted=false
    ORDER BY word_similarity('airpods max', name) DESC LIMIT 8`);

  // 3. Joriy RPC nimani qaytaradi: "airpods max"
  await q('advanced_smart_search("airpods max")', `
    SELECT name FROM advanced_smart_search('airpods max', NULL, 0.15, 50, NULL) LIMIT 10`);

  // 4. "vgr" tokeni bo'yicha jami nechta mahsulot bor
  await q('VGR jami', `
    SELECT count(*) AS vgr_count FROM products
    WHERE is_deleted=false AND (name ILIKE '%vgr%' OR name_uz ILIKE '%vgr%')`);

  // 5. "vgr v-097" RPC nechta qaytaradi
  await q('advanced_smart_search("vgr v-097") soni', `
    SELECT count(*) AS cnt FROM advanced_smart_search('vgr v-097', NULL, 0.15, 50, NULL)`);

  // 6. similarity(name,'vgr v-097') ba'zi VGR mahsulotlar uchun
  await q('VGR mahsulotlar sim("vgr v-097")', `
    SELECT name,
      round(similarity(name,'vgr v-097')::numeric,3) AS sim_whole,
      round(word_similarity('vgr', name)::numeric,3) AS wordsim_vgr
    FROM products WHERE is_deleted=false AND name ILIKE '%vgr%'
    ORDER BY similarity(name,'vgr v-097') DESC LIMIT 12`);

  await c.end();
}
main();
