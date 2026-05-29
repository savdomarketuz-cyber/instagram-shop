-- categories jadvaliga image_meta (jsonb) ustunini qo'shadi.
-- Ilova kodi (mapCategory, catalog/page.tsx, admin/categories) bu ustunni kutadi:
-- kategoriya rasmi uchun blur/variant metadatasi { xs, md, lg, lowResUrl, blurDataURL }.
-- Ustun bo'lmaganida categories SELECT 400 qaytarib, butun kategoriyalar ro'yxati
-- (shu jumladan bosh sahifadagi "Kategoriya Vitrina") bo'sh chiqardi.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_meta jsonb;

-- PostgREST schema keshini yangilash
NOTIFY pgrst, 'reload schema';
