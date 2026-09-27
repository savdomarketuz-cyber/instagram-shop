-- Task 4.4C-1 (5): advanced_smart_search'ni anon/authenticated'dan yopish
-- HOLAT: yozilgan, BAJARILMAGAN.
--
-- Muammo: funksiya RETURNS SETOF products (to'liq qator: cost_price, comm_*, embedding,
-- ai_persona...) va hozir PUBLIC/anon/authenticated EXECUTE qila oladi — ya'ni ochiq anon
-- kalit bilan /rest/v1/rpc/advanced_smart_search orqali butun jadvalni ichki maydonlari
-- bilan olish mumkin.
--
-- Kod tekshiruvi (bajarishdan OLDIN shart):
--   * src/app/api/search/route.ts — server route, 4.4C-1 dan boshlab supabaseAdmin
--     (service role) bilan chaqiradi; javob toPublicProduct orqali tozalanadi.
--   * src/lib/health-checker.ts — server, supabaseAdmin.
--   * Brauzer kodi (src, velari_app) bu funksiyani chaqirmaydi.
--   Ya'ni bu migratsiya 4.4C-1 commit'i Vercel'da deploy bo'lgandan KEYIN bajariladi
--   (undan oldin /api/search anon klient bilan ishlagan — qidiruv buzilardi).
--
-- Eslatma: PostgreSQL funksiyalarga standart holatda PUBLIC'ga EXECUTE beradi, shuning
-- uchun faqat anon/authenticated'dan olish yetmaydi — PUBLIC'dan ham olinadi.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.advanced_smart_search(
    text, vector, double precision, integer, text, text, numeric, numeric, text, numeric, text, integer, text[]
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.advanced_smart_search(
    text, vector, double precision, integer, text, text, numeric, numeric, text, numeric, text, integer, text[]
) TO service_role;

COMMIT;

-- Tekshiruv (bajarilgandan keyin):
--   select has_function_privilege('anon', 'public.advanced_smart_search(text, vector, double precision, integer, text, text, numeric, numeric, text, numeric, text, integer, text[])', 'EXECUTE');  -- false
--   select has_function_privilege('service_role', '...', 'EXECUTE');  -- true
--   Saytda qidiruv (POST /api/search) natija qaytarishi kerak.
--
-- Orqaga qaytarish:
--   GRANT EXECUTE ON FUNCTION public.advanced_smart_search(text, vector, double precision, integer, text, text, numeric, numeric, text, numeric, text, integer, text[]) TO PUBLIC, anon, authenticated;
