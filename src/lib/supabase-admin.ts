import { createClient } from '@supabase/supabase-js';

/**
 * SERVER-ONLY Supabase Admin Client (bypasses RLS)
 * 
 * ⚠️ Bu fayl faqat API routes va Server Components dan import qilinishi kerak!
 * Hech qachon "use client" komponentlardan import QILMANG!
 * 
 * Service Role Key — bu Supabase RLS ni to'liq chetlab o'tadi.
 * Client-side ga tushib ketsa, barcha ma'lumotlar ochiq bo'ladi.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (typeof window !== 'undefined') {
    throw new Error(
        'XAVFSIZLIK BUZILISHI: supabase-admin.ts client-side da import qilindi! ' +
        'Faqat server-side (API routes, Server Components) da ishlatish kerak.'
    );
}

if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY muhit o\'zgaruvchisi o\'rnatilmagan!');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    // ⚠️ KRITIK: Next.js App Router har bir ichki fetch'ni Data Cache'ga oladi.
    // Busiz admin/mijoz buyurtma holatini o'qiganda Next eski keshlangan
    // Supabase javobini qaytarardi (DB "Kutilmoqda" bo'lsa ham UI "Yetkazildi").
    // Anon mijoz (supabase.ts) allaqachon shunday tuzatilgan — admin'da yo'q edi.
    global: {
        fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' })
    }
});
