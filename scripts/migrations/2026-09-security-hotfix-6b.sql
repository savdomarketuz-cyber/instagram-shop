-- Task 6B: promo/hamkorlik jadvallari, ortiqcha yozish huquqlari, standart huquqlar
-- (egasi production'da bajarishga ruxsat bergan; oldin eksport, bitta tranzaksiya)
--
-- Kod tekshiruvi (bajarishdan oldin): quyidagi 7 jadval bilan faqat server ishlaydi
-- (supabaseAdmin: api/orders/place, api/promo-codes/validate, api/affiliate/*, api/admin/*,
-- ref/[slug], api/products/[id]/params). Brauzer (admin'ni ham qo'shganda) va velari_app ularga
-- anon bilan YOZMAYDI; faqat category_params/product_param_values o'qilishi mumkin — SELECT qoladi.
-- Shuning uchun kod o'zgarishi/deploy talab qilinmadi.

BEGIN;

-- 1. RLS o'chiq bo'lgan jadvallar: RLS yoqiladi, siyosat qo'shilmaydi (brauzer ishlatmaydi),
--    anon/authenticated/PUBLIC huquqlari olinadi. service_role — BYPASSRLS + o'z GRANT'lari.
ALTER TABLE public.promo_code_tariffs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links       ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.promo_code_tariffs, public.affiliate_promo_codes, public.promo_redemptions,
                    public.referral_attributions, public.affiliate_links
    FROM anon, authenticated, PUBLIC;

-- 2. Mahsulot xususiyatlari: ommaviy o'qish qoladi, yozish faqat server orqali.
--    (Mavjud "ALL ... true" siyosati qoladi, lekin huquq bo'lmagani uchun yozish ishlamaydi.)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.category_params, public.product_param_values
    FROM anon, authenticated, PUBLIC;

-- 3. Task 1.5 zaxirasi (id, article) — endi kerak emas (eksport faylda saqlangan).
DROP TABLE public.products_backup_20260926;

-- 4. TRUNCATE RLS'ga bo'ysunmaydi — hech bir public jadvalda anon/authenticated'da bo'lmasin.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 5. Kelajak uchun: postgres yaratadigan YANGI obyektlar anon/authenticated'ga avtomatik ochilmasin.
--    (Mavjud obyektlarga ta'sir qilmaydi. service_role va postgres uchun standart saqlanadi.)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL     ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL     ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
--    PostgreSQL har yangi funksiyaga PUBLIC EXECUTE beradi (global standart) — uni ham olamiz,
--    aks holda anon PUBLIC orqali baribir bajara oladi. Bu postgres yaratadigan barcha
--    sxemalardagi YANGI funksiyalarga taalluqli.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;

-- ───────── Ta'siri (kelajakda) ─────────
-- Yangi jadval: anon/authenticated uchun REST'da ko'rinmaydi, toki aniq GRANT qilinmaguncha:
--   GRANT SELECT ON public.<jadval> TO anon, authenticated;   (+ RLS va siyosat)
-- Yangi funksiya (RPC): brauzer chaqirishi kerak bo'lsa:
--   GRANT EXECUTE ON FUNCTION public.<fn>(...) TO anon, authenticated;
-- Server (service_role) uchun hech narsa qilish shart emas.
--
-- ───────── Orqaga qaytarish ─────────
-- BEGIN;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
-- GRANT TRUNCATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- CREATE TABLE public.products_backup_20260926 (id text, article text);  -- + eksport fayldan INSERT
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.category_params, public.product_param_values TO anon, authenticated;
-- GRANT ALL ON public.promo_code_tariffs, public.affiliate_promo_codes, public.promo_redemptions,
--              public.referral_attributions, public.affiliate_links TO anon, authenticated;
-- ALTER TABLE public.promo_code_tariffs DISABLE ROW LEVEL SECURITY;   -- (va qolgan 4 tasi)
-- COMMIT;
