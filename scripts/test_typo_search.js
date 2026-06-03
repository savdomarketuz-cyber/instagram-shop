require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const QUERIES = [
  'vgr v-097', 'vgr', 'airpods max', 'airpods', 'arpods', 'ayrpods', 'airpod',
  'pods max', 'trimer', 'trimmer', 'soch olish mashinkasi', 'mashinka',
  'vgr trimer', 'profesional', 'grooming', 'клипер', 'клиппер'
];

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const q of QUERIES) {
    const t0 = Date.now();
    const r = await c.query(
      `SELECT name FROM advanced_smart_search($1, NULL, 0.30, 50, NULL)`, [q]
    );
    const ms = Date.now() - t0;
    console.log(`\n"${q}"  → ${r.rowCount} ta  (${ms}ms)`);
    r.rows.slice(0, 3).forEach(x => console.log('   • ' + x.name.slice(0, 65)));
  }
  await c.end();
}
main();
