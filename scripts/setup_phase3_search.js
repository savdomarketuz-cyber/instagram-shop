require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- Drop the old function if signature changed, but we can just use CREATE OR REPLACE if signature matches
-- We are adding an optional p_user_identifier parameter
DROP FUNCTION IF EXISTS advanced_smart_search(text, vector, double precision, integer);
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
    v_user_profile record;
BEGIN
  -- 1. Fetch the user's affinity profile if a user identifier is provided
  IF p_user_identifier IS NOT NULL THEN
     SELECT * INTO v_user_profile FROM user_affinity_profiles WHERE user_identifier = p_user_identifier LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM products p
  WHERE p.is_deleted = false
    AND (
      -- Condition 1: High text similarity (Fuzzy search)
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
      -- Condition 2: Semantic Similarity
      (query_embedding IS NOT NULL AND p.embedding IS NOT NULL AND (1 - (p.embedding <=> query_embedding)) > match_threshold)
    )
  ORDER BY (
      -- Base Score (Text & Semantic)
      (
          CASE WHEN search_query IS NOT NULL AND search_query != '' THEN
              -- Exact Match
              CASE WHEN p.name ILIKE search_query OR p.name_uz ILIKE search_query OR p.name_ru ILIKE search_query THEN 100 ELSE 0 END
              +
              -- Prefix Match
              CASE WHEN p.name ILIKE search_query || '%' OR p.name_uz ILIKE search_query || '%' OR p.name_ru ILIKE search_query || '%' THEN 50 ELSE 0 END
              +
              -- Trigram similarity
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
      
      -- +++ PHASE 3: BEHAVIORAL RANKING MULTIPLIERS +++ --
      
      +
      -- Objective Product Score (from Telemetry)
      (COALESCE(p.total_wishlists, 0) * 2.0) +      -- Wishlisting shows high intent
      (COALESCE(p.total_views, 0) * 0.1) -         -- Basic views give minor boost
      (COALESCE(p.total_returns, 0) * 5.0) +       -- High return rate penalizes heavily
      (CASE WHEN COALESCE(p.sales, 0) > 10 THEN 15 ELSE 0 END) -- Proven seller bonus
      
      +
      -- User Profile Affinity Match (Amazon A9 Logic)
      (
          CASE WHEN v_user_profile IS NOT NULL THEN
              -- 1. Price Segment Alignment
              (CASE 
                  WHEN v_user_profile.price_segment = 'budget' AND p.price < 500000 THEN 30
                  WHEN v_user_profile.price_segment = 'premium' AND p.price > 5000000 THEN 30
                  ELSE 0 
              END)
              +
              -- 2. Discount Seeker Match
              (CASE 
                  WHEN v_user_profile.discount_seeker = true AND p.old_price IS NOT NULL AND p.old_price > p.price THEN 40
                  ELSE 0 
              END)
              +
              -- 3. Top Category Match (if this product's category is in their frequent list)
              (CASE 
                  WHEN v_user_profile.top_categories ? p.category_id THEN 
                     LEAST((v_user_profile.top_categories->>p.category_id)::int * 2, 20) -- up to 20 pts based on frequency
                  ELSE 0
              END)
          ELSE 0 END
      )

  ) DESC, p.sales DESC
  LIMIT match_count;
END;
$$;
`;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        await client.query(sql);
        console.log('✅ Phase 3: Advanced Smart Search with Behavioral & Affinity Ranking installed!');
    } catch (err) {
        console.error('❌ DB Setup Error:', err);
    } finally {
        await client.end();
    }
}

main();
