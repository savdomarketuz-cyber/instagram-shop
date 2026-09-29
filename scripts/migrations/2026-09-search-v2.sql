-- TASK Q, 3-qism: matnli qidiruv v2.
-- Eski advanced_smart_search / suggest_products O'ZGARTIRILMAYDI (backup = o'zi, hamda
-- scripts/migration_search_stock_v1.sql). Route yangi funksiyaga o'tadi; orqaga qaytish —
-- route'ni oldingi commit'ga qaytarish, keyin pastdagi DROP'lar.
--
-- Yangiliklar:
--  * So'rov = token GURUHLARI (jsonb [["fen","hair dryer"],["qora","black"]]): guruh ichida
--    variantlardan biri mos kelsa yetadi (sinonim asl so'zni almashtirmaydi — qo'shiladi).
--  * p_min_groups: nechta guruh mos kelishi SHART (2 so'z — 2, 3+ — 2/3). 0 natija bo'lsa
--    route 1 bilan qayta chaqiradi (yumshatish).
--  * Kategoriya nomi (uz/ru) ham qidiriladi; 3 harfgacha tokenlar so'z boshidan ("oq" ≠ "soqol").
--  * Mashhurlik bonusi logarifmik, maksimum 50 ball.
--  * Natija: {total, facets (BUTUN natija bo'yicha), items (sahifa: id, score, coverage, sem)}.
--  * search_did_you_mean: katalogda uchramaydigan so'zni eng yaqin mavjud so'zga tuzatadi.
--  * search_query_embeddings: so'rov embedding keshi (model bo'yicha).

BEGIN;

CREATE TABLE IF NOT EXISTS public.search_query_embeddings (
    query      text NOT NULL,
    model      text NOT NULL,
    embedding  vector NOT NULL,
    hits       integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (query, model)
);
ALTER TABLE public.search_query_embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.search_query_embeddings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.search_query_embeddings TO service_role;

CREATE OR REPLACE FUNCTION public.smart_search_v2(
    p_groups          jsonb,
    p_raw             text,
    p_min_groups      integer DEFAULT 1,
    p_fuzzy           double precision DEFAULT 0.4,
    query_embedding   vector DEFAULT NULL,
    p_sem_threshold   double precision DEFAULT 0.5,
    p_category_ids    text[] DEFAULT NULL,
    p_min_price       numeric DEFAULT NULL,
    p_max_price       numeric DEFAULT NULL,
    p_brand_ids       text[] DEFAULT NULL,
    p_min_rating      numeric DEFAULT NULL,
    p_sort            text DEFAULT NULL,
    p_offset          integer DEFAULT 0,
    p_limit           integer DEFAULT 24,
    p_user_identifier text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_q        text := lower(trim(coalesce(p_raw, '')));
    v_ngroups  int  := coalesce(jsonb_array_length(p_groups), 0);
    v_need     int  := LEAST(GREATEST(coalesce(p_min_groups, 1), 1), GREATEST(coalesce(jsonb_array_length(p_groups), 0), 1));
    v_has_profile boolean := false;
    v_price_segment text;
    v_discount_seeker boolean;
    v_top_categories jsonb;
    v_result   jsonb;
BEGIN
    IF p_user_identifier IS NOT NULL THEN
        SELECT price_segment, discount_seeker, top_categories
          INTO v_price_segment, v_discount_seeker, v_top_categories
          FROM user_affinity_profiles WHERE user_identifier = p_user_identifier LIMIT 1;
        v_has_profile := FOUND;
    END IF;

    WITH grp AS (
        SELECT g.ord, a.alt
        FROM jsonb_array_elements(coalesce(p_groups, '[]'::jsonb)) WITH ORDINALITY AS g(alts, ord)
        CROSS JOIN LATERAL jsonb_array_elements_text(g.alts) AS a(alt)
        WHERE length(a.alt) > 0
    ),
    base AS (
        SELECT p.id, p.name, p.name_uz, p.name_ru, p.article, p.model, p.sku, p.category_id,
               p.price, p.old_price, p.created_at, p.avg_rating, p.sales, p.embedding,
               p.total_views, p.total_wishlists, p.total_returns,
               lower(concat_ws(' ', p.name, p.name_uz, p.name_ru, p.tag, p.article, p.model, p.sku,
                               c.name, c.name_uz, c.name_ru)) AS hay
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_deleted = false
          AND get_product_stock(p.stock, p.stock_details) > 0
          AND (p_category_ids IS NULL OR cardinality(p_category_ids) = 0 OR p.category_id = ANY(p_category_ids))
          AND (p_brand_ids IS NULL OR cardinality(p_brand_ids) = 0 OR p.brand_id = ANY(p_brand_ids))
          AND (p_min_price IS NULL OR p.price >= p_min_price)
          AND (p_max_price IS NULL OR p.price <= p_max_price)
          AND (p_min_rating IS NULL OR coalesce(p.avg_rating, 0) >= p_min_rating)
    ),
    words AS (
        -- so'z chegaralari: harf/raqam/'/./- dan boshqa hamma belgi probelga
        SELECT b.id, x.hw, string_to_array(trim(x.hw), ' ') AS warr
        FROM base b CROSS JOIN LATERAL (SELECT ' ' || regexp_replace(b.hay, '[^[:alnum:]''.-]+', ' ', 'g') || ' ' AS hw) x
    ),
    -- Har mahsulot × guruh: eng yaxshi variant bahosi (1 = aniq moslik, <1 = fuzzy)
    gm AS (
        SELECT b.id, grp.ord,
               max(
                 CASE
                   -- 3 harfgacha: faqat so'z boshidan ("oq" -> "oq rang", lekin "soqol" emas)
                   WHEN length(grp.alt) <= 3 THEN CASE WHEN strpos(w.hw, ' ' || grp.alt) > 0 THEN 1.0 ELSE 0 END
                   WHEN strpos(b.hay, grp.alt) > 0 THEN 1.0
                   -- ko'p so'zli variant (lug'atdagi "hair dryer") faqat aniq: fuzzy'da "Hair Clipper"ga yopishardi
                   WHEN strpos(grp.alt, ' ') > 0 THEN 0
                   -- fuzzy (typo): alohida so'z bilan, birinchi harfi bir xil va uzunligi yaqin bo'lsa.
                   -- Butun matn bilan solishtirilganda qo'shimchalar yopishardi ("uzuklar"≈"erkaklar", "ipad"≈"Iparah").
                   -- Qisqa so'zlarda (≤6) chegara +0.1.
                   ELSE coalesce((SELECT max(s) FROM (
                            SELECT similarity(grp.alt, x) AS s FROM unnest(w.warr) AS x
                            WHERE left(x, 1) = left(grp.alt, 1) AND abs(length(x) - length(grp.alt)) <= 3
                        ) f WHERE s >= p_fuzzy + CASE WHEN length(grp.alt) <= 6 THEN 0.1 ELSE 0 END), 0)
                 END
               ) AS best
        FROM base b JOIN words w ON w.id = b.id CROSS JOIN grp
        GROUP BY b.id, grp.ord
    ),
    m AS (
        SELECT id,
               count(*) FILTER (WHERE best > 0) AS coverage,
               sum(best) AS sim_sum
        FROM gm GROUP BY id
    ),
    cand AS (
        SELECT b.*, coalesce(m.coverage, 0) AS coverage, coalesce(m.sim_sum, 0) AS sim_sum,
               CASE WHEN query_embedding IS NOT NULL AND b.embedding IS NOT NULL
                    THEN 1 - (b.embedding <=> query_embedding) END AS sem
        FROM base b LEFT JOIN m ON m.id = b.id
    ),
    hits AS (
        SELECT c.*,
          (
            (CASE WHEN v_q <> '' AND (lower(coalesce(c.article, '')) = v_q OR lower(coalesce(c.model, '')) = v_q OR lower(coalesce(c.sku, '')) = v_q) THEN 1500 ELSE 0 END)
            + (CASE WHEN v_q <> '' AND (lower(coalesce(c.article, '')) LIKE v_q || '%' OR lower(coalesce(c.model, '')) LIKE v_q || '%') THEN 400 ELSE 0 END)
            + (CASE WHEN v_ngroups > 0 THEN (c.coverage::float / v_ngroups) * 1000 ELSE 0 END)
            + (CASE WHEN v_q <> '' AND (lower(c.name) = v_q OR lower(c.name_uz) = v_q OR lower(c.name_ru) = v_q) THEN 400 ELSE 0 END)
            + (CASE WHEN v_q <> '' AND (lower(c.name) LIKE v_q || '%' OR lower(c.name_uz) LIKE v_q || '%' OR lower(c.name_ru) LIKE v_q || '%') THEN 150 ELSE 0 END)
            + c.sim_sum * 80
            + coalesce(c.sem, 0) * 300
            -- Mashhurlik: logarifmik, maksimum 50 (to'g'ri moslikdan ustun kelmaydi)
            + LEAST(50, 6 * ln(1 + coalesce(c.total_views, 0)) + 8 * ln(1 + coalesce(c.total_wishlists, 0)) + 8 * ln(1 + coalesce(c.sales, 0)))
            - LEAST(30, 10 * ln(1 + coalesce(c.total_returns, 0)))
            + (CASE WHEN v_has_profile THEN
                  (CASE WHEN v_price_segment = 'budget' AND c.price < 500000 THEN 15
                        WHEN v_price_segment = 'premium' AND c.price > 5000000 THEN 15 ELSE 0 END)
                + (CASE WHEN v_discount_seeker AND c.old_price > c.price THEN 15 ELSE 0 END)
                + (CASE WHEN v_top_categories ? c.category_id THEN LEAST((v_top_categories->>c.category_id)::int * 2, 20) ELSE 0 END)
               ELSE 0 END)
          ) AS score
        FROM cand c
        WHERE v_ngroups = 0
           OR c.coverage >= v_need
           OR (c.sem IS NOT NULL AND c.sem >= p_sem_threshold)
    ),
    page AS (
        SELECT id, score, coverage, sem
        FROM hits
        ORDER BY
            CASE WHEN p_sort = 'price_asc'  THEN price END ASC NULLS LAST,
            CASE WHEN p_sort = 'price_desc' THEN price END DESC NULLS LAST,
            CASE WHEN p_sort = 'new'        THEN created_at END DESC NULLS LAST,
            CASE WHEN p_sort = 'rating'     THEN coalesce(avg_rating, 0) END DESC NULLS LAST,
            score DESC, sales DESC NULLS LAST, id
        OFFSET GREATEST(coalesce(p_offset, 0), 0)
        LIMIT LEAST(GREATEST(coalesce(p_limit, 24), 1), 101)
    )
    SELECT jsonb_build_object(
        'total',   (SELECT count(*) FROM hits),
        'groups',  v_ngroups,
        -- sahifadan qat'i nazar: eng yaxshi natija nechta guruhni qamradi (AI kerakmi — route hal qiladi)
        'max_coverage', (SELECT max(coverage) FROM hits),
        -- har guruh (so'z) filtrlar ichida nechta mahsulotga mos: 0 bo'lsa yumshatish ma'nosiz
        'group_hits', coalesce((SELECT jsonb_agg(n ORDER BY ord) FROM (SELECT ord, count(*) FILTER (WHERE best > 0) n FROM gm GROUP BY ord) gh), '[]'::jsonb),
        'facets',  coalesce((SELECT jsonb_object_agg(category_id, n) FROM (SELECT category_id, count(*) n FROM hits WHERE category_id IS NOT NULL GROUP BY category_id) f), '{}'::jsonb),
        'items',   coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'score', round(score::numeric, 1), 'coverage', coverage, 'sem', round(sem::numeric, 3))) FROM page), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$function$;

-- "Balki shuni nazarda tutdingizmi?": stokdagi mahsulot/kategoriya nomlarida UCHRAMAYDIGAN
-- tokenni eng yaqin mavjud so'zga almashtiradi. Hech narsa tuzatilmasa NULL.
CREATE OR REPLACE FUNCTION public.search_did_you_mean(p_tokens text[], p_min_sim double precision DEFAULT 0.45)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_out text[] := '{}';
    v_changed boolean := false;
    v_tok text;
    v_best text;
BEGIN
    FOREACH v_tok IN ARRAY p_tokens LOOP
        v_best := NULL;
        IF length(v_tok) >= 4 AND v_tok !~ '[0-9]' THEN
            WITH vocab AS (
                SELECT DISTINCT w FROM (
                    -- faqat uz/ru nomlar: asl p.name ko'pincha inglizcha ("Hair Clipper") — xaridorga uz/ru so'z ko'rinsin
                    SELECT regexp_split_to_table(lower(concat_ws(' ', p.name_uz, p.name_ru, c.name_uz, c.name_ru)), '[^[:alnum:]'']+') AS w
                    FROM products p LEFT JOIN categories c ON c.id = p.category_id
                    WHERE p.is_deleted = false AND get_product_stock(p.stock, p.stock_details) > 0
                ) s WHERE length(w) >= 3
            )
            SELECT CASE WHEN EXISTS (SELECT 1 FROM vocab WHERE strpos(w, v_tok) > 0) THEN NULL
                        ELSE (SELECT w FROM vocab WHERE similarity(v_tok, w) >= p_min_sim
                              ORDER BY similarity(v_tok, w) DESC, length(w) LIMIT 1) END
              INTO v_best;
        END IF;
        IF v_best IS NOT NULL THEN v_out := v_out || v_best; v_changed := true;
        ELSE v_out := v_out || v_tok; END IF;
    END LOOP;

    RETURN CASE WHEN v_changed THEN array_to_string(v_out, ' ') END;
END;
$function$;

-- Kesh statistikasi (route javobni kutmasdan chaqiradi)
CREATE OR REPLACE FUNCTION public.touch_search_query_embedding(p_query text, p_model text)
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $function$
    UPDATE search_query_embeddings SET hits = hits + 1, last_used = now()
     WHERE query = p_query AND model = p_model;
$function$;
REVOKE ALL ON FUNCTION public.touch_search_query_embedding(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_search_query_embedding(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.smart_search_v2(jsonb, text, integer, double precision, vector, double precision, text[], numeric, numeric, text[], numeric, text, integer, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_did_you_mean(text[], double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.smart_search_v2(jsonb, text, integer, double precision, vector, double precision, text[], numeric, numeric, text[], numeric, text, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_did_you_mean(text[], double precision) TO service_role;

COMMIT;

-- ───────── Orqaga qaytarish ─────────
-- 1) src/app/api/search/route.ts ni advanced_smart_search ishlatgan commit'ga qaytarish
-- 2) BEGIN;
--    DROP FUNCTION IF EXISTS public.smart_search_v2(jsonb, text, integer, double precision, vector, double precision, text[], numeric, numeric, text[], numeric, text, integer, integer, text);
--    DROP FUNCTION IF EXISTS public.search_did_you_mean(text[], double precision);
--    DROP TABLE IF EXISTS public.search_query_embeddings;
--    COMMIT;
