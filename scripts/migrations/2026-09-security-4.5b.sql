-- Task 4.5B: bazani oxirgi yopish (egasi ruxsat bergan)
-- Tartib: avval 2026-09-match-products-public-columns.sql va 2026-09-revoke-advanced-smart-search.sql,
-- keyin shu fayl. Shart: 4.5A (cdba37a) va 4.5B tayyorgarlik kodi (3b2eb8f) deploy qilingan.
--
-- Kod tekshiruvi:
--  * Brauzer (src, admin'dan tashqari) products'ni faqat PUBLIC_PRODUCT_COLUMNS ichidagi ustunlar bilan
--    so'raydi/filtrlaydi/saralaydi; products(...) join yo'q. Admin — /api/admin/query (service role).
--  * Statistika jadvallariga brauzer yozmaydi; server route'lari supabaseAdmin'da (3b2eb8f).
--  * Brauzer faqat 3 ta RPC chaqiradi: track_product_view, increment_reel_likes, match_products_by_embedding.
--  * Trigger ichida chaqiriladigan generate_wallet_number/generate_product_article — service_role'da qoladi.
--  * velari_app (mobil) products'dan ai_persona so'raydi — bu so'rov endi ishlamaydi (egasi rozi).

BEGIN;

-- 1. products: jadval darajasidagi barcha huquq olinadi (ustun darajasida revoke jadval grant'i bor
--    paytda ishlamaydi), keyin faqat ochiq ustunlarga SELECT beriladi. Yozish huquqi qaytarilmaydi.
REVOKE ALL ON TABLE public.products FROM anon, authenticated;
GRANT SELECT (
    id, article, sku, model, name, name_uz, name_ru, description, description_uz, description_ru,
    price, old_price, stock, stock_details, image, images, image_metadata, video_url,
    category_id, brand_id, group_id, color_name, is_original, is_deleted, express_delivery,
    avg_rating, review_count, sales, created_at
) ON public.products TO anon, authenticated;

-- 2. Statistika jadvallari: yozish faqat server (service role) orqali
REVOKE INSERT, UPDATE, DELETE ON TABLE
    public.search_analytics, public.search_clicks, public.user_status, public.user_telemetry_logs
    FROM anon, authenticated;

-- 3. Brauzer ishlatmaydigan funksiyalar: faqat service_role
REVOKE EXECUTE ON FUNCTION
    public.generate_wallet_number(),
    public.handle_return_cashback_penalty(text),
    public.place_order(text,jsonb,numeric,text,numeric[],text,text,numeric),
    public.adjust_wallet_balance(text,numeric,text,text,text),
    public.match_products(vector,double precision,integer),
    public.greater_than(numeric,numeric),
    public.log_search_click(text,text),
    public.increment_product_views(text),
    public.increment_product_wishlists(text,integer),
    public.place_order(text,jsonb,numeric,text,jsonb,text),
    public.get_product_stock(integer,jsonb),
    public.advanced_smart_search(text,vector,double precision,integer,text,text,numeric,numeric,text,numeric,text,integer,text[]),
    public.decrement_product_stock(text,integer),
    public.increment_real_balance(text,numeric),
    public.smart_search(text,integer),
    public.place_order(text,jsonb,text,jsonb,text,text,numeric),
    public.generate_product_article(),
    public.increment_promo_usage(uuid,numeric),
    public.restore_expired_orders(),
    public.suggest_products(text,integer),
    public.match_products_by_image(vector,double precision,integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.generate_wallet_number(),
    public.handle_return_cashback_penalty(text),
    public.place_order(text,jsonb,numeric,text,numeric[],text,text,numeric),
    public.adjust_wallet_balance(text,numeric,text,text,text),
    public.match_products(vector,double precision,integer),
    public.greater_than(numeric,numeric),
    public.log_search_click(text,text),
    public.increment_product_views(text),
    public.increment_product_wishlists(text,integer),
    public.place_order(text,jsonb,numeric,text,jsonb,text),
    public.get_product_stock(integer,jsonb),
    public.advanced_smart_search(text,vector,double precision,integer,text,text,numeric,numeric,text,numeric,text,integer,text[]),
    public.decrement_product_stock(text,integer),
    public.increment_real_balance(text,numeric),
    public.smart_search(text,integer),
    public.place_order(text,jsonb,text,jsonb,text,text,numeric),
    public.generate_product_article(),
    public.increment_promo_usage(uuid,numeric),
    public.restore_expired_orders(),
    public.suggest_products(text,integer),
    public.match_products_by_image(vector,double precision,integer)
TO service_role;

COMMIT;

-- Bajarildi: 2026-09-27, bitta tranzaksiyada (oldingi 2 migratsiya bilan birga), 102/102 tekshiruv.
-- Backup (grant/ACL holati) bajarishdan oldin olindi.

-- ───────── Orqaga qaytarish ─────────
-- BEGIN;
-- GRANT ALL ON TABLE public.products TO anon, authenticated;
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.search_analytics, public.search_clicks, public.user_status, public.user_telemetry_logs TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION <yuqoridagi 21 ta funksiya> TO PUBLIC, anon, authenticated;
-- COMMIT;
