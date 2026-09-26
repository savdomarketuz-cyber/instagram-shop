-- Task 1.5: Artikulni avtomatik va noyob qilish
-- Har bir mahsulotda doim noyob artikul bo'ladi -> URL "nom--ART-XXXXXX" (UUID emas).
--
-- Oldindan tekshiruv (2026-09-26): artikulsiz = 467 (jami 738, shundan 2 tasi is_deleted),
-- takroriy artikul = 0, "--" yoki probelli artikul = 0.
--
-- Bitta tranzaksiya: biror qadam yiqilsa, hech narsa o'zgarmaydi.

BEGIN;

-- 0. Zaxira nusxa (faqat id va article)
CREATE TABLE IF NOT EXISTS products_backup_20260926 AS
SELECT id, article FROM products;

-- 1. Generator: 'ART-' + 6 belgi, alifbo admin'dagi generateArticle bilan AYNAN bir xil (O va 0 yo'q).
--    Bazada mavjud bo'lmagan kod topilguncha qayta urinadi.
CREATE OR REPLACE FUNCTION generate_product_article()
RETURNS text AS $$
DECLARE
    chars constant text := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    candidate text;
BEGIN
    LOOP
        candidate := 'ART-';
        FOR i IN 1..6 LOOP
            candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM products WHERE article = candidate);
    END LOOP;
    RETURN candidate;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

-- 2. Trigger: artikul bo'sh bo'lsa (INSERT'da yoki UPDATE'da bo'shatilsa) yangisini beradi.
--    Artikul bor bo'lsa TEGMAYDI (qo'lda kiritilgan va import artikullari saqlanadi).
CREATE OR REPLACE FUNCTION products_set_article()
RETURNS trigger AS $$
BEGIN
    IF NEW.article IS NULL OR trim(NEW.article) = '' THEN
        NEW.article := generate_product_article();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_products_set_article ON products;
CREATE TRIGGER tr_products_set_article
BEFORE INSERT OR UPDATE OF article ON products
FOR EACH ROW
EXECUTE FUNCTION products_set_article();

-- 3. Noyoblik. To'ldirishdan OLDIN yaratiladi: bitta UPDATE ichida ikki qatorga bir xil
--    kod tushib qolsa (generator shu buyruqdagi yangi qatorlarni ko'rmaydi), tranzaksiya
--    xato bilan to'xtaydi va hech narsa o'zgarmaydi - qayta ishga tushirish kifoya.
CREATE UNIQUE INDEX IF NOT EXISTS products_article_unique
ON products (article)
WHERE article IS NOT NULL AND trim(article) <> '';

-- 4. Mavjud artikulsiz mahsulotlarni to'ldirish (is_deleted ham kiradi).
--    Trigger har biriga kod beradi; updated_at sitemap lastmod uchun yangilanadi.
UPDATE products
SET article = NULL, updated_at = now()
WHERE article IS NULL OR trim(article) = '';

COMMIT;

-- ───────────── Tekshiruv (migratsiyadan keyin, alohida ishga tushiriladi) ─────────────
-- select count(*) from products where article is null or trim(article) = '';          -- 0
-- select article, count(*) from products group by article having count(*) > 1;         -- bo'sh
-- select indexname from pg_indexes where indexname = 'products_article_unique';        -- 1 qator
--
-- Keyingi qadamlar:
--   1) POST /api/admin/revalidate-all  (sitemap va sahifalar yangilanadi)
--   2) Admin paneldagi "Hammasini indeksatsiyaga yuborish" (IndexNow -> Bing/Yandex)
--   Eski /uz/products/<nom>--<uuid> URL'lari 308 bilan yangi URL'ga o'tadi (kod o'zgarmaydi).
--
-- Orqaga qaytarish (kerak bo'lsa):
--   drop trigger if exists tr_products_set_article on products;
--   drop index if exists products_article_unique;
--   update products p set article = b.article from products_backup_20260926 b where b.id = p.id;
