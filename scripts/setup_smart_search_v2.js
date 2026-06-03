require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

/**
 * Typo-tolerant, tokenized smart search.
 *
 * Maqsad: mijoz qanchalik imloviy xato bilan yozsa ham niyatini tushunish.
 *
 * Asosiy g'oya — so'rovni SO'ZLARGA AJRATIB (tokenize), har bir so'zni alohida
 * mahsulot maydonlariga moslash:
 *   - ILIKE '%token%'  → aniq qism (GIN trigram indeksdan foydalanadi, tez)
 *   - word_similarity(token, name) → fuzzy: token nomdagi ENG MOS so'zga qanchalik yaqin
 *     (butun-satr similarity'dan farqli, uzun nomlarda ham ishlaydi — "arpods"→"Pods")
 *
 * Reyting: token-coverage (nechta so'z mos kelgani) DOMINANT, keyin o'xshashlik
 * yig'indisi + exact/prefix bonus + behavioral signallar.
 *
 * match_threshold endi word_similarity chegarasi sifatida ishlatiladi (0.30 normal,
 * route.ts fallback'da pasaytiradi).
 */
const sql = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP FUNCTION IF EXISTS advanced_smart_search(text, vector(384), double precision, integer, text);

CREATE OR REPLACE FUNCTION advanced_smart_search (
  search_query text,
  query_embedding vector(384) DEFAULT NULL,
  match_threshold float DEFAULT 0.30,
  match_count int DEFAULT 50,
  p_user_identifier text DEFAULT NULL
)
RETURNS SETOF products
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_profile boolean := false;
    v_price_segment text;
    v_discount_seeker boolean;
    v_top_categories jsonb;
    v_q text;
    v_tokens text[];
    v_token_count int;
BEGIN
  v_q := lower(trim(coalesce(search_query, '')));
  -- So'rovni so'zlarga ajratamiz (bo'sh elementlarni tashlaymiz)
  v_tokens := ARRAY(
    SELECT tok FROM unnest(regexp_split_to_array(v_q, '\\s+')) AS tok WHERE length(tok) > 0
  );
  v_token_count := GREATEST(array_length(v_tokens, 1), 1);

  IF p_user_identifier IS NOT NULL THEN
     SELECT price_segment, discount_seeker, top_categories
       INTO v_price_segment, v_discount_seeker, v_top_categories
       FROM user_affinity_profiles WHERE user_identifier = p_user_identifier LIMIT 1;
     IF FOUND THEN v_has_profile := true; END IF;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM products p
  LEFT JOIN LATERAL (
    -- Har bir token uchun: mos keldimi (matched) va eng yaxshi o'xshashlik (best_sim)
    SELECT
      count(*) FILTER (WHERE tk.matched) AS coverage,
      COALESCE(sum(tk.best_sim), 0)      AS sim_sum
    FROM (
      SELECT
        (
          p.name    ILIKE '%' || tok || '%' OR
          p.name_uz ILIKE '%' || tok || '%' OR
          p.name_ru ILIKE '%' || tok || '%' OR
          p.tag     ILIKE '%' || tok || '%' OR
          p.article ILIKE '%' || tok || '%' OR
          p.sku     ILIKE '%' || tok || '%' OR
          GREATEST(
            word_similarity(tok, COALESCE(p.name, '')),
            word_similarity(tok, COALESCE(p.name_uz, '')),
            word_similarity(tok, COALESCE(p.name_ru, ''))
          ) >= match_threshold
        ) AS matched,
        GREATEST(
          CASE WHEN p.name ILIKE '%' || tok || '%' OR p.name_uz ILIKE '%' || tok || '%' OR p.name_ru ILIKE '%' || tok || '%'
               THEN 1.0 ELSE 0 END,
          word_similarity(tok, COALESCE(p.name, '')),
          word_similarity(tok, COALESCE(p.name_uz, '')),
          word_similarity(tok, COALESCE(p.name_ru, ''))
        ) AS best_sim
      FROM unnest(v_tokens) AS tok
    ) tk
  ) m ON true
  WHERE p.is_deleted = false
    AND (
      v_q = ''
      OR m.coverage > 0
      OR (query_embedding IS NOT NULL AND p.embedding IS NOT NULL AND (1 - (p.embedding <=> query_embedding)) > 0.5)
    )
  ORDER BY (
      -- 1) TOKEN COVERAGE — dominant: nechta so'z mos keldi (foiz sifatida)
      ( (COALESCE(m.coverage, 0)::float / v_token_count) * 1000 )
      +
      -- 2) Exact / prefix bonus (butun so'rov)
      ( CASE WHEN v_q <> '' AND (lower(p.name) = v_q OR lower(p.name_uz) = v_q OR lower(p.name_ru) = v_q) THEN 400 ELSE 0 END )
      +
      ( CASE WHEN v_q <> '' AND (lower(p.name) LIKE v_q || '%' OR lower(p.name_uz) LIKE v_q || '%' OR lower(p.name_ru) LIKE v_q || '%') THEN 150 ELSE 0 END )
      +
      -- 3) Token o'xshashlik yig'indisi (fuzzy sifat)
      ( COALESCE(m.sim_sum, 0) * 80 )
      +
      -- 4) Semantic (agar embedding bo'lsa)
      ( CASE WHEN query_embedding IS NOT NULL AND p.embedding IS NOT NULL THEN (1 - (p.embedding <=> query_embedding)) * 120 ELSE 0 END )
      +
      -- 5) BEHAVIORAL signallar
      (COALESCE(p.total_wishlists, 0) * 2.0) +
      (COALESCE(p.total_views, 0) * 0.1) -
      (COALESCE(p.total_returns, 0) * 5.0) +
      (CASE WHEN COALESCE(p.sales, 0) > 10 THEN 15 ELSE 0 END)
      +
      -- 6) USER AFFINITY (agar profil bo'lsa)
      ( CASE WHEN v_has_profile THEN
          (CASE
              WHEN v_price_segment = 'budget'  AND p.price < 500000  THEN 30
              WHEN v_price_segment = 'premium' AND p.price > 5000000 THEN 30
              ELSE 0 END)
          +
          (CASE WHEN v_discount_seeker = true AND p.old_price IS NOT NULL AND p.old_price > p.price THEN 40 ELSE 0 END)
          +
          (CASE WHEN v_top_categories ? p.category_id
                THEN LEAST((v_top_categories->>p.category_id)::int * 2, 20) ELSE 0 END)
        ELSE 0 END )
  ) DESC, p.sales DESC NULLS LAST
  LIMIT match_count;
END;
$$;
`;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('Connected. Installing tokenized typo-tolerant advanced_smart_search...');
        await client.query(sql);
        console.log('✅ Smart Search v2 (tokenized + word_similarity) installed!');
    } catch (err) {
        console.error('❌ DB Setup Error:', err);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

main();
