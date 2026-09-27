-- Task 6C: xabarlar va hamyonlar — ochiq SELECT siyosatlarini olib tashlash
-- Shart: sayt kodi (f98aaa7) deploy qilingan — sayt bu jadvallarni endi /api/me/* (service role)
-- orqali o'qiydi. service_role BYPASSRLS, "Service Role Only ..." siyosatlari saqlanadi.
--
-- DIQQAT: velari_app (mobil ilova) user_wallets, cashback_transactions, wallet_transfers'ni
-- anon kalit bilan to'g'ridan-to'g'ri o'qiydi — 2-qismdan keyin ilovada balans/tarix bo'sh chiqadi.
-- private_messages'ni ilova ishlatmaydi (1-qism ilovaga ta'sir qilmaydi).

BEGIN;

-- 1. private_messages: "... OR true" — barcha shaxsiy xabarlar hammaga ochiq edi
DROP POLICY IF EXISTS "Users can read their own chat messages" ON public.private_messages;
REVOKE ALL ON TABLE public.private_messages FROM anon, authenticated;

-- 2. Hamyon: nomi "own" bo'lsa ham sharti `true` edi — barcha telefon va balanslar ochiq
DROP POLICY IF EXISTS "Users can only see their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can only see their own transactions" ON public.cashback_transactions;
REVOKE ALL ON TABLE public.user_wallets, public.cashback_transactions FROM anon, authenticated;

COMMIT;

-- Tekshiruv: ochiq kalit bilan GET /rest/v1/{private_messages,user_wallets,cashback_transactions}
--   → 401 permission denied; saytda /api/me/messages va /api/me/wallet ishlaydi.
--
-- Orqaga qaytarish:
-- BEGIN;
-- GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.private_messages, public.user_wallets, public.cashback_transactions TO anon, authenticated;
-- CREATE POLICY "Users can read their own chat messages" ON public.private_messages FOR SELECT USING (
--   ((auth.uid())::text = (SELECT p.p FROM unnest((SELECT private_chats.participants FROM private_chats WHERE private_chats.id = private_messages.chat_id)) p(p) WHERE p.p = (auth.uid())::text)) OR true);
-- CREATE POLICY "Users can only see their own wallet" ON public.user_wallets FOR SELECT USING (true);
-- CREATE POLICY "Users can only see their own transactions" ON public.cashback_transactions FOR SELECT USING (true);
-- COMMIT;
