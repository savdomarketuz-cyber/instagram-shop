-- Task 6: SHOSHILINCH xavfsizlik tuzatishi (egasi production'da bajarishga ruxsat bergan)
--
-- 1) login_tokens: RLS o'chiq edi va anon/authenticated'da INSERT/SELECT/UPDATE/DELETE bor edi —
--    ochiq anon kalit bilan istalgan telefon uchun token yozib, /api/auth/telegram-login orqali
--    o'sha foydalanuvchi sifatida kirish mumkin edi (akkauntni egallab olish).
-- 2) Hamyon funksiyalari (get_global_wallet_audit, process_p2p_transfer v1..v4, p2p_transfer)
--    PUBLIC/anon/authenticated tomonidan bajarilishi mumkin edi (SECURITY DEFINER, search_path yo'q).
--
-- Kod tekshiruvi: login_tokens va bu funksiyalar faqat server (supabaseAdmin / adminRpc →
-- /api/admin/crud) orqali ishlatiladi: api/auth/telegram-login, api/bot, lib/telegram,
-- api/wallet/transfer/confirm (v4), admin/wallets (get_global_wallet_audit). velari_app ishlatmaydi.
-- service_role — o'z GRANT'lari + BYPASSRLS, shuning uchun server ta'sirlanmaydi.
-- Funksiyalar extensions sxemasiga murojaat qilmaydi — search_path = public xavfsiz.
--
-- Oldin: login_tokens qatorlari va joriy ACL'lar eksport qilingan (repozitoriydan tashqarida).

BEGIN;

-- 1. login_tokens
ALTER TABLE public.login_tokens ENABLE ROW LEVEL SECURITY;          -- siyosat QO'SHILMAYDI
REVOKE ALL ON TABLE public.login_tokens FROM anon, authenticated, PUBLIC;
UPDATE public.login_tokens SET used = true WHERE used = false;      -- ishlatilmagan tokenlarni bekor qilish

-- 2. Hamyon funksiyalari
REVOKE EXECUTE ON FUNCTION public.get_global_wallet_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_p2p_transfer(uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_p2p_transfer_v2(text, text, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_p2p_transfer_v3(text, text, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_p2p_transfer_v4(text, text, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.p2p_transfer(text, text, numeric) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_global_wallet_audit() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_p2p_transfer(uuid, uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_p2p_transfer_v2(text, text, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_p2p_transfer_v3(text, text, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_p2p_transfer_v4(text, text, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.p2p_transfer(text, text, numeric) TO service_role;

-- SECURITY DEFINER bo'lganlari (p2p_transfer — invoker, unga kerak emas)
ALTER FUNCTION public.get_global_wallet_audit() SET search_path = public;
ALTER FUNCTION public.process_p2p_transfer(uuid, uuid, numeric, text) SET search_path = public;
ALTER FUNCTION public.process_p2p_transfer_v2(text, text, numeric, text) SET search_path = public;
ALTER FUNCTION public.process_p2p_transfer_v3(text, text, numeric, text) SET search_path = public;
ALTER FUNCTION public.process_p2p_transfer_v4(text, text, numeric, text) SET search_path = public;

COMMIT;

-- ───────── Tekshiruv ─────────
-- select has_table_privilege('anon', 'public.login_tokens', 'INSERT');   -- false
-- select has_table_privilege('anon', 'public.login_tokens', 'SELECT');   -- false
-- select has_function_privilege('anon', 'public.process_p2p_transfer_v4(text,text,numeric,text)', 'EXECUTE');  -- false
-- (har bir funksiya uchun xuddi shunday); service_role uchun — true.
-- Ochiq kalit bilan GET /rest/v1/login_tokens → xato (42501) yoki 0 qator.
--
-- ───────── Orqaga qaytarish (faqat zarurat bo'lsa; zaiflikni QAYTA OCHADI) ─────────
-- BEGIN;
-- ALTER TABLE public.login_tokens DISABLE ROW LEVEL SECURITY;
-- GRANT ALL ON TABLE public.login_tokens TO anon, authenticated;
-- -- used=true qilingan tokenlar eksport faylidan tiklanadi (token bo'yicha used=false).
-- GRANT EXECUTE ON FUNCTION public.get_global_wallet_audit() TO PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.process_p2p_transfer(uuid, uuid, numeric, text) TO PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.process_p2p_transfer_v2(text, text, numeric, text) TO PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.process_p2p_transfer_v3(text, text, numeric, text) TO PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.process_p2p_transfer_v4(text, text, numeric, text) TO PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.p2p_transfer(text, text, numeric) TO PUBLIC, anon, authenticated;
-- ALTER FUNCTION public.get_global_wallet_audit() RESET search_path;
-- ALTER FUNCTION public.process_p2p_transfer(uuid, uuid, numeric, text) RESET search_path;
-- ALTER FUNCTION public.process_p2p_transfer_v2(text, text, numeric, text) RESET search_path;
-- ALTER FUNCTION public.process_p2p_transfer_v3(text, text, numeric, text) RESET search_path;
-- ALTER FUNCTION public.process_p2p_transfer_v4(text, text, numeric, text) RESET search_path;
-- COMMIT;
