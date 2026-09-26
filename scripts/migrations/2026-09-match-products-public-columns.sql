-- Task 4.4A: match_products_by_embedding faqat ommaviy ustunlarni qaytarsin
-- HOLAT: yozilgan, BAJARILMAGAN. 4.5 (anon huquqlarini cheklash) dan OLDIN bajariladi.
--
-- Muammo: funksiya `SELECT p.*` / RETURNS SETOF products — brauzer (anon, ProductClient
-- "o'xshash mahsulotlar") to'liq qatorni oladi: cost_price, additional_expenses, comm_*,
-- barcode, embedding, ai_persona, sales, total_views...
--
-- Yechim: qaytish turi faqat ommaviy ustunlar (src/lib/public-product.ts dagi
-- PUBLIC_PRODUCT_COLUMNS bilan bir xil). SECURITY DEFINER — 4.5 da anon'dan `embedding`
-- ustuni huquqi olinganda ham o'xshashlik hisoblanaversin (embedding tashqariga chiqmaydi).
-- Qaytish turi o'zgargani uchun DROP + CREATE kerak (CREATE OR REPLACE turini o'zgartira olmaydi).
-- Ilova kodi o'zgarmaydi: ProductClient .rpc(...) natijasini mapProduct'dan o'tkazadi.

BEGIN;

DROP FUNCTION IF EXISTS public.match_products_by_embedding(text, integer);

CREATE FUNCTION public.match_products_by_embedding(p_id text, p_match_count integer DEFAULT 10)
RETURNS TABLE (
    id text,
    article text,
    sku text,
    model text,
    name text,
    name_uz text,
    name_ru text,
    description text,
    description_uz text,
    description_ru text,
    price numeric,
    old_price numeric,
    stock integer,
    stock_details jsonb,
    image text,
    images text[],
    image_metadata jsonb,
    video_url text,
    category_id text,
    brand_id text,
    group_id text,
    color_name text,
    is_original boolean,
    is_deleted boolean,
    express_delivery boolean,
    avg_rating numeric,
    review_count integer,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT p.id, p.article, p.sku, p.model, p.name, p.name_uz, p.name_ru,
         p.description, p.description_uz, p.description_ru,
         p.price, p.old_price, p.stock, p.stock_details,
         p.image, p.images, p.image_metadata, p.video_url,
         p.category_id, p.brand_id, p.group_id, p.color_name,
         p.is_original, p.is_deleted, p.express_delivery,
         p.avg_rating, p.review_count, p.created_at
  FROM public.products p
  WHERE p.is_deleted = false
    AND p.id <> p_id
    AND p.embedding IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.products s WHERE s.id = p_id AND s.embedding IS NOT NULL)
  ORDER BY p.embedding <=> (SELECT embedding FROM public.products WHERE id = p_id)
  LIMIT LEAST(GREATEST(p_match_count, 1), 50);
$function$;

-- Avvalgi huquqlar bilan bir xil (anon, authenticated, service_role — EXECUTE)
REVOKE ALL ON FUNCTION public.match_products_by_embedding(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_products_by_embedding(text, integer) TO anon, authenticated, service_role;

COMMIT;

-- Tekshiruv (bajarilgandan keyin):
--   select * from public.match_products_by_embedding('<product id>', 3);  -- faqat yuqoridagi 28 ustun
--
-- Orqaga qaytarish:
--   DROP FUNCTION public.match_products_by_embedding(text, integer);
--   CREATE FUNCTION public.match_products_by_embedding(p_id text, p_match_count integer DEFAULT 10)
--   RETURNS SETOF products LANGUAGE sql STABLE AS $f$
--     SELECT p.* FROM public.products p
--     WHERE p.is_deleted = false AND p.id <> p_id AND p.embedding IS NOT NULL
--       AND EXISTS (SELECT 1 FROM public.products s WHERE s.id = p_id AND s.embedding IS NOT NULL)
--     ORDER BY p.embedding <=> (SELECT embedding FROM public.products WHERE id = p_id)
--     LIMIT p_match_count;
--   $f$;
--   GRANT EXECUTE ON FUNCTION public.match_products_by_embedding(text, integer) TO anon, authenticated, service_role;
