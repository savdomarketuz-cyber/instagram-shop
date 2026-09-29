-- TASK Q, 4-qism (1/2): yangi embedding'lar uchun joy. Mavjud ustunlarga TEGMAYDI.
--  * products.embedding_next vector(768) — gemini-embedding-001 matn vektori
--    (scripts/embed-products.mjs --column embedding_next bilan to'ldiriladi, keyin
--    2026-09-embeddings-swap.sql bilan asosiy ustunga almashtiriladi).
--  * product_image_embeddings — har mahsulotning 4 tagacha rasmi (asosiy + galereya),
--    image_metadata dagi lg WEBP varianti, gemini-embedding-2 (768).
--  * match_products_by_image_v2 — mahsulot rasmlari ichidagi ENG YAXSHI moslik, faqat stokdagilar.

BEGIN;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS embedding_next vector(768);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS embedding_next_hash text;

CREATE TABLE IF NOT EXISTS public.product_image_embeddings (
    product_id text        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    position   smallint    NOT NULL,
    image_url  text        NOT NULL,
    url_hash   text        NOT NULL,
    model      text        NOT NULL,
    embedding  vector(768) NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, position)
);
ALTER TABLE public.product_image_embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_image_embeddings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.product_image_embeddings TO service_role;

CREATE OR REPLACE FUNCTION public.match_products_by_image_v2(
    query_embedding vector,
    match_threshold double precision DEFAULT 0.5,
    match_count     integer DEFAULT 24
)
RETURNS TABLE(id text, similarity double precision, image_position smallint)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
    SELECT b.product_id, b.sim, b.position
    FROM (
        -- har mahsulotdan eng o'xshash rasmi
        SELECT DISTINCT ON (x.product_id) x.product_id, x.sim, x.position
        FROM (
            SELECT e.product_id, e.position, (1 - (e.embedding <=> query_embedding))::float AS sim
            FROM product_image_embeddings e
            JOIN products p ON p.id = e.product_id
            WHERE p.is_deleted = false
              AND get_product_stock(p.stock, p.stock_details) > 0
        ) x
        WHERE x.sim > match_threshold
        ORDER BY x.product_id, x.sim DESC
    ) b
    ORDER BY b.sim DESC
    LIMIT LEAST(GREATEST(match_count, 1), 100)
$function$;

REVOKE ALL ON FUNCTION public.match_products_by_image_v2(vector, double precision, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_products_by_image_v2(vector, double precision, integer) TO service_role;

COMMIT;

-- ───────── Orqaga qaytarish ─────────
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.match_products_by_image_v2(vector, double precision, integer);
-- DROP TABLE IF EXISTS public.product_image_embeddings;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS embedding_next, DROP COLUMN IF EXISTS embedding_next_hash;
-- COMMIT;
