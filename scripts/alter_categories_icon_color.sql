-- Kategoriya vitrinasi (featured-categories) admin sahifasi uchun
-- categories jadvaliga icon (emoji) va color (rang) ustunlarini qo'shadi.
-- Bu ustunlar bo'lmaganida REST so'rovi 400 qaytarib, kategoriyalar ro'yxati bo'sh chiqardi.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color text;

-- PostgREST schema keshini yangilash
NOTIFY pgrst, 'reload schema';
