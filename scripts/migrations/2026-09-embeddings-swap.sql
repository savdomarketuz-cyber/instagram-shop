-- TASK Q, 4-qism (2/2): matn embedding'ini all-MiniLM-L6-v2 (384) → gemini-embedding-001 (768) ga almashtirish.
-- Shart: 2026-09-embeddings-v2.sql bajarilgan va `node scripts/embed-products.mjs --column embedding_next`
-- barcha faol mahsulotlarni to'ldirgan (aks holda tranzaksiya xato bilan to'xtaydi).
-- Eski vektorlar: public.products_embedding_minilm_backup (id, embedding, embedding_hash).
-- match_products_by_embedding / smart_search_v2 ustunni nomi bilan ishlatadi — o'zgartirish shart emas.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.products WHERE is_deleted = false AND embedding_next IS NULL) THEN
        RAISE EXCEPTION 'embedding_next hali to''liq emas — avval: node scripts/embed-products.mjs --column embedding_next';
    END IF;
END $$;

CREATE TABLE public.products_embedding_minilm_backup AS
    SELECT id, embedding, embedding_hash, now() AS backed_up_at FROM public.products;
ALTER TABLE public.products_embedding_minilm_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.products_embedding_minilm_backup FROM PUBLIC, anon, authenticated;

DROP INDEX IF EXISTS public.products_embedding_idx;          -- ivfflat (384), lists=100
ALTER TABLE public.products DROP COLUMN embedding;
ALTER TABLE public.products DROP COLUMN embedding_hash;
ALTER TABLE public.products RENAME COLUMN embedding_next TO embedding;
ALTER TABLE public.products RENAME COLUMN embedding_next_hash TO embedding_hash;
-- 736 qatorda ivfflat(lists=100) yaqinlashuvi yomon (probes=1 → o'xshashlar kam qaytardi); HNSW aniqroq
CREATE INDEX products_embedding_hnsw_idx ON public.products USING hnsw (embedding vector_cosine_ops);

COMMIT;

-- ───────── Orqaga qaytarish ─────────
-- (route'ni ham Xenova/all-MiniLM ishlatgan commit'ga qaytarish kerak)
-- BEGIN;
-- DROP INDEX IF EXISTS public.products_embedding_hnsw_idx;
-- ALTER TABLE public.products RENAME COLUMN embedding TO embedding_next;
-- ALTER TABLE public.products RENAME COLUMN embedding_hash TO embedding_next_hash;
-- ALTER TABLE public.products ADD COLUMN embedding vector(384), ADD COLUMN embedding_hash text;
-- UPDATE public.products p SET embedding = b.embedding, embedding_hash = b.embedding_hash
--   FROM public.products_embedding_minilm_backup b WHERE b.id = p.id;
-- CREATE INDEX products_embedding_idx ON public.products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- COMMIT;
