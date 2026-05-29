require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const sql = `
CREATE OR REPLACE FUNCTION public.match_products_by_embedding(p_id text, p_match_count int DEFAULT 10)
RETURNS SETOF public.products
LANGUAGE sql STABLE
AS $$
  SELECT p.*
  FROM public.products p
  WHERE p.is_deleted = false
    AND p.id <> p_id
    AND p.embedding IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.products s WHERE s.id = p_id AND s.embedding IS NOT NULL)
  ORDER BY p.embedding <=> (SELECT embedding FROM public.products WHERE id = p_id)
  LIMIT p_match_count;
$$;
GRANT EXECUTE ON FUNCTION public.match_products_by_embedding(text, int) TO anon, authenticated, service_role;
`;
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(sql);
  console.log('✅ match_products_by_embedding RPC yaratildi + grant berildi');
  // tezkor test
  const seed = await c.query(`SELECT id, COALESCE(name_uz,name) nm FROM products WHERE is_deleted=false AND embedding IS NOT NULL LIMIT 1`);
  const r = await c.query(`SELECT COALESCE(name_uz,name) nm FROM match_products_by_embedding($1, 3)`, [seed.rows[0].id]);
  console.log('seed:', seed.rows[0].nm);
  console.log('NN:', r.rows.map(x=>x.nm));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
