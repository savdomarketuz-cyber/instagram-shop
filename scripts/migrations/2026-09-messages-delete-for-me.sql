-- Task 6D-A: xabarlarni "Faqat mendan" o'chirish (faqat qo'shimcha ustunlar, ma'lumot o'zgarmaydi)
--
-- private_messages.hidden_for  — xabarni o'zidan yashirgan ishtirokchilar (telefon raqamlari, faqat raqam)
-- private_chats.cleared_at     — {telefon_raqami: vaqt} — shu ishtirokchi uchun suhbat shu vaqtgacha tozalangan;
--                                undan keyingi xabarlar va yangi xabar kelganda suhbat qayta ko'rinadi.
-- Bu ustunlarni faqat server (/api/me/messages, /api/me/chats, service role) o'qiydi/yozadi.

BEGIN;

ALTER TABLE public.private_messages ADD COLUMN IF NOT EXISTS hidden_for text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.private_chats    ADD COLUMN IF NOT EXISTS cleared_at jsonb  NOT NULL DEFAULT '{}'::jsonb;

-- "hidden_for @> {telefon}" filtri uchun
CREATE INDEX IF NOT EXISTS private_messages_hidden_for_gin ON public.private_messages USING gin (hidden_for);

COMMIT;

-- Orqaga qaytarish:
-- BEGIN;
-- DROP INDEX IF EXISTS public.private_messages_hidden_for_gin;
-- ALTER TABLE public.private_messages DROP COLUMN IF EXISTS hidden_for;
-- ALTER TABLE public.private_chats    DROP COLUMN IF EXISTS cleared_at;
-- COMMIT;
