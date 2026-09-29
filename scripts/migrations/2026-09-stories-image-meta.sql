-- TASK P2: stories rasmlari uchun variantlar (mahsulot/kategoriya rasmlari kabi).
-- image_meta = { blurDataURL, lowResUrl (360x480 thumb), xs, md, lg } — /api/admin/upload javobi.
-- Aylana eng kichik variantni (lowResUrl/xs) + blur ni, story ochilganda lg ni oladi.
-- Mavjud yozuvlar: scripts/backfill-image-variants.mjs (asl fayllar o'chirilmaydi).

BEGIN;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS image_meta jsonb;
COMMIT;

-- Orqaga qaytarish:
-- ALTER TABLE public.stories DROP COLUMN IF EXISTS image_meta;
