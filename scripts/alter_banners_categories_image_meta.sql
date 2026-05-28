-- Banner va Category rasm variantlari uchun JSONB ustun
-- Supabase SQL Editor'da bir marta run qiling

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS image_meta JSONB DEFAULT '{}'::jsonb;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS image_meta JSONB DEFAULT '{}'::jsonb;

-- Struktura:
--   banners.image_meta = { "uz": { xs, md, lg, lowResUrl, blurDataURL }, "ru": { ... } }
--   categories.image_meta = { xs, md, lg, lowResUrl, blurDataURL }
