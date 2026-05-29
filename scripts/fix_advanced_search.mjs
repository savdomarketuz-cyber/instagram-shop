import { readFileSync } from 'fs';
import pg from 'pg';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

const sql = `
DROP FUNCTION IF EXISTS advanced_smart_search(text, vector(384), double precision, integer, text);

CREATE OR REPLACE FUNCTION advanced_smart_search (
  search_query text,
  query_embedding vector(384) DEFAULT NULL,
  match_threshold float DEFAULT 0.15,
  match_count int DEFAULT 50,
  p_user_identifier text DEFAULT NULL
)
RETURNS SETOF products
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_profile user_affinity_profiles%ROWTYPE;
    v_has_profile boolean := false;
BEGIN
  IF p_user_identifier IS NOT NULL THEN
     SELECT * INTO v_user_profile
       FROM user_affinity_profiles
      WHERE user_identifier = p_user_identifier
      LIMIT 1;
     IF FOUND THEN
        v_has_profile := true;
     END IF;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM products p
  WHERE p.is_deleted = false
    AND (
      (search_query IS NOT NULL AND search_query != '' AND (
        similarity(COALESCE(p.name, ''), search_query) > 0.1 OR
        similarity(COALESCE(p.name_uz, ''), search_query) > 0.1 OR
        similarity(COALESCE(p.name_ru, ''), search_query) > 0.1 OR
        similarity(COALESCE(p.description, ''), search_query) > 0.1 OR
        p.name ILIKE '%' || search_query || '%' OR
        p.name_uz ILIKE '%' || search_query || '%' OR
        p.name_ru ILIKE '%' || search_query || '%' OR
        p.sku ILIKE '%' || search_query || '%' OR
        p.article ILIKE '%' || search_query || '%' OR
        p.tag ILIKE '%' || search_query || '%'
      ))
      OR
      (query_embedding IS NOT NULL AND p.embedding IS NOT NULL AND (1 - (p.embedding <=> query_embedding)) > match_threshold)
    )
  ORDER BY (
      (
          CASE WHEN search_query IS NOT NULL AND search_query != '' THEN
              CASE WHEN p.name ILIKE search_query OR p.name_uz ILIKE search_query OR p.name_ru ILIKE search_query THEN 100 ELSE 0 END
              +
              CASE WHEN p.name ILIKE search_query || '%' OR p.name_uz ILIKE search_query || '%' OR p.name_ru ILIKE search_query || '%' THEN 50 ELSE 0 END
              +
              (similarity(COALESCE(p.name, ''), search_query) * 40) +
              (similarity(COALESCE(p.name_uz, ''), search_query) * 40) +
              (similarity(COALESCE(p.name_ru, ''), search_query) * 40) +
              (similarity(COALESCE(p.description, ''), search_query) * 10) +
              (similarity(COALESCE(p.tag, ''), search_query) * 5)
          ELSE 0 END
      )
      +
      (CASE WHEN query_embedding IS NOT NULL AND p.embedding IS NOT NULL THEN
        (1 - (p.embedding <=> query_embedding)) * 80
      ELSE 0 END)
      +
      -- Behavioral ranking (telemetry)
      (COALESCE(p.total_wishlists, 0) * 2.0) +
      (COALESCE(p.total_views, 0) * 0.1) -
      (COALESCE(p.total_returns, 0) * 5.0) +
      (CASE WHEN COALESCE(p.sales, 0) > 10 THEN 15 ELSE 0 END)
      +
      -- User affinity (only when profile found)
      (
          CASE WHEN v_has_profile THEN
              (CASE
                  WHEN v_user_profile.price_segment = 'budget' AND p.price < 500000 THEN 30
                  WHEN v_user_profile.price_segment = 'premium' AND p.price > 5000000 THEN 30
                  ELSE 0
              END)
              +
              (CASE
                  WHEN v_user_profile.discount_seeker = true AND p.old_price IS NOT NULL AND p.old_price > p.price THEN 40
                  ELSE 0
              END)
              +
              (CASE
                  WHEN v_user_profile.top_categories ? p.category_id THEN
                     LEAST((v_user_profile.top_categories->>p.category_id)::int * 2, 20)
                  ELSE 0
              END)
          ELSE 0 END
      )
  ) DESC, p.sales DESC
  LIMIT match_count;
END;
$$;
`;

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query(sql);
  console.log('✅ advanced_smart_search tuzatildi (v_user_profile bug fix)');
  // Test
  const r1 = await c.query("SELECT id, name FROM advanced_smart_search('vgr', NULL, 0.15, 3, NULL)");
  console.log(`✅ Anonim qidiruv: ${r1.rows.length} natija`);
  r1.rows.forEach(x => console.log('   -', (x.name || '').slice(0, 50)));
} catch (e) {
  console.error('❌ XATO:', e.message);
} finally {
  await c.end();
}
