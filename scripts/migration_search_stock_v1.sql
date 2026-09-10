-- 1. Create get_product_stock IMMUTABLE SQL function
CREATE OR REPLACE FUNCTION get_product_stock(p_stock integer, p_stock_details jsonb)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_stock_details IS NOT NULL AND p_stock_details <> '{}'::jsonb THEN
      COALESCE((
        SELECT sum(value::numeric)::integer
        FROM jsonb_each_text(p_stock_details)
        WHERE value ~ '^[0-9]+$'
      ), 0)
    ELSE
      COALESCE(p_stock, 0)
  END;
$$;

-- 2. Drop existing advanced_smart_search if overloaded to ensure clean signature
DROP FUNCTION IF EXISTS advanced_smart_search(text, vector, double precision, integer, text);
DROP FUNCTION IF EXISTS advanced_smart_search(text, vector, double precision, integer, text, text, numeric, numeric, text, numeric, text, integer);

-- 3. Create updated advanced_smart_search with stock verification, exact model token bonus, and backend filters
CREATE OR REPLACE FUNCTION advanced_smart_search (
  search_query text,
  query_embedding vector DEFAULT NULL,
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 50,
  p_user_identifier text DEFAULT NULL,
  p_category_id text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_brand_id text DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  p_sort text DEFAULT NULL,
  p_offset int DEFAULT 0
)
RETURNS SETOF products
LANGUAGE plpgsql
AS $function$
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
  v_tokens := ARRAY(
    SELECT tok FROM unnest(regexp_split_to_array(v_q, '\s+')) AS tok WHERE length(tok) > 0
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
          p.model   ILIKE '%' || tok || '%' OR
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
    -- UNIFIED STOCK CHECK: Only products with stock in warehouse or default stock > 0
    AND get_product_stock(p.stock, p.stock_details) > 0
    -- Category filter
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    -- Brand filter
    AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
    -- Price filters
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    AND (p_max_price IS NULL OR p.price <= p_max_price)
    -- Rating filter
    AND (p_min_rating IS NULL OR COALESCE(p.avg_rating, 0) >= p_min_rating)
    -- Search query & semantic match
    AND (
      v_q = ''
      OR m.coverage > 0
      OR (query_embedding IS NOT NULL AND p.embedding IS NOT NULL AND (1 - (p.embedding <=> query_embedding)) > 0.4)
    )
  ORDER BY 
    CASE 
      WHEN p_sort = 'price_asc' THEN p.price 
      ELSE NULL 
    END ASC NULLS LAST,
    CASE 
      WHEN p_sort = 'price_desc' THEN p.price 
      ELSE NULL 
    END DESC NULLS LAST,
    CASE 
      WHEN p_sort = 'new' THEN EXTRACT(EPOCH FROM p.created_at) 
      ELSE NULL 
    END DESC NULLS LAST,
    CASE 
      WHEN p_sort = 'rating' THEN COALESCE(p.avg_rating, 0) 
      ELSE NULL 
    END DESC NULLS LAST,
    -- Default relevance / popular sorting:
    (
      -- Exact Article / Model / SKU match bonus (Highest priority)
      ( CASE WHEN v_q <> '' AND (lower(COALESCE(p.article, '')) = v_q OR lower(COALESCE(p.model, '')) = v_q OR lower(COALESCE(p.sku, '')) = v_q) THEN 1500 ELSE 0 END )
      +
      -- Token matches model or article exactly:
      ( CASE WHEN EXISTS (
          SELECT 1 FROM unnest(v_tokens) tok 
          WHERE length(tok) >= 3 AND (lower(COALESCE(p.model, '')) = tok OR lower(COALESCE(p.article, '')) = tok OR lower(COALESCE(p.sku, '')) = tok)
        ) THEN 1200 ELSE 0 END )
      +
      ( CASE WHEN v_q <> '' AND (lower(COALESCE(p.article, '')) LIKE v_q || '%' OR lower(COALESCE(p.model, '')) LIKE v_q || '%') THEN 400 ELSE 0 END )
      +
      -- 1) TOKEN COVERAGE — dominant: percentage of tokens matched
      ( (COALESCE(m.coverage, 0)::float / v_token_count) * 1000 )
      +
      -- 2) Exact / prefix name bonus (whole query)
      ( CASE WHEN v_q <> '' AND (lower(p.name) = v_q OR lower(p.name_uz) = v_q OR lower(p.name_ru) = v_q) THEN 400 ELSE 0 END )
      +
      ( CASE WHEN v_q <> '' AND (lower(p.name) LIKE v_q || '%' OR lower(p.name_uz) LIKE v_q || '%' OR lower(p.name_ru) LIKE v_q || '%') THEN 150 ELSE 0 END )
      +
      -- 3) Token similarity sum (fuzzy quality)
      ( COALESCE(m.sim_sum, 0) * 80 )
      +
      -- 4) Semantic similarity (when embedding present)
      ( CASE WHEN query_embedding IS NOT NULL AND p.embedding IS NOT NULL THEN (1 - (p.embedding <=> query_embedding)) * 200 ELSE 0 END )
      +
      -- 5) BEHAVIORAL signals
      (COALESCE(p.total_wishlists, 0) * 2.0) +
      (COALESCE(p.total_views, 0) * 0.1) -
      (COALESCE(p.total_returns, 0) * 5.0) +
      (CASE WHEN COALESCE(p.sales, 0) > 10 THEN 15 ELSE 0 END)
      +
      -- 6) USER AFFINITY
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
    ) DESC,
    p.sales DESC NULLS LAST
  OFFSET p_offset
  LIMIT match_count;
END;
$function$;
