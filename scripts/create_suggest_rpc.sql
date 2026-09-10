-- Lightweight suggest_products RPC for fast typeahead
CREATE OR REPLACE FUNCTION suggest_products(
  search_query text,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id text,
  name text,
  name_uz text,
  name_ru text,
  price numeric,
  old_price numeric,
  image text,
  images text[],
  image_metadata jsonb,
  category_id text,
  model text,
  article text
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_q text;
  v_tokens text[];
  v_token_count int;
BEGIN
  v_q := lower(trim(coalesce(search_query, '')));
  IF v_q = '' THEN
    RETURN;
  END IF;

  v_tokens := ARRAY(
    SELECT tok FROM unnest(regexp_split_to_array(v_q, '\s+')) AS tok WHERE length(tok) > 0
  );
  v_token_count := GREATEST(array_length(v_tokens, 1), 1);

  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.name_uz,
    p.name_ru,
    p.price,
    p.old_price,
    p.image,
    p.images,
    p.image_metadata,
    p.category_id,
    p.model,
    p.article
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
          p.article ILIKE '%' || tok || '%' OR
          p.model   ILIKE '%' || tok || '%' OR
          GREATEST(
            word_similarity(tok, COALESCE(p.name, '')),
            word_similarity(tok, COALESCE(p.name_uz, '')),
            word_similarity(tok, COALESCE(p.name_ru, ''))
          ) >= 0.25
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
    AND get_product_stock(p.stock, p.stock_details) > 0
    AND m.coverage > 0
  ORDER BY (
    ( CASE WHEN lower(COALESCE(p.article, '')) = v_q OR lower(COALESCE(p.model, '')) = v_q THEN 800 ELSE 0 END )
    +
    ( (COALESCE(m.coverage, 0)::float / v_token_count) * 1000 )
    +
    ( CASE WHEN lower(p.name) = v_q OR lower(p.name_uz) = v_q OR lower(p.name_ru) = v_q THEN 400 ELSE 0 END )
    +
    ( CASE WHEN lower(p.name) LIKE v_q || '%' OR lower(p.name_uz) LIKE v_q || '%' OR lower(p.name_ru) LIKE v_q || '%' THEN 150 ELSE 0 END )
    +
    ( COALESCE(m.sim_sum, 0) * 80 )
    +
    ( CASE WHEN COALESCE(p.sales, 0) > 10 THEN 15 ELSE 0 END )
  ) DESC, p.sales DESC NULLS LAST
  LIMIT match_count;
END;
$function$;
