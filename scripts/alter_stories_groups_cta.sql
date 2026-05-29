-- Stories: Instagram uslubidagi guruhlash + CTA ("Xarid qilish") tugmasi
-- Supabase SQL Editor da bir marta ishga tushiring.

-- 1) Guruh kaliti: bir xil group_key ga ega storylar bitta pufakka (bubble) jamlanadi.
--    NULL bo'lsa — story o'zicha alohida guruh (eski xatti-harakat bilan mos).
ALTER TABLE stories ADD COLUMN IF NOT EXISTS group_key text;

-- 2) Guruh sarlavhasi (pufak nomi). Bo'sh bo'lsa — guruhdagi birinchi slayd sarlavhasi ishlatiladi.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS group_title_uz text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS group_title_ru text;

-- 3) CTA ("Xarid qilish") tugmasi — har bir slaydga biriktiriladi.
--    cta_type: 'none' | 'product' | 'category' | 'brand'
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cta_type text DEFAULT 'none';
--    cta_ids: bog'langan mahsulot/kategoriya/brend id'lari ro'yxati
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cta_ids jsonb DEFAULT '[]'::jsonb;
--    cta_label: tugma matni (bo'sh bo'lsa standart "Xarid qilish / Купить")
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cta_label_uz text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cta_label_ru text;

-- Indeks: guruh + tartib bo'yicha tez o'qish
CREATE INDEX IF NOT EXISTS idx_stories_group ON stories (group_key, sort_order);
