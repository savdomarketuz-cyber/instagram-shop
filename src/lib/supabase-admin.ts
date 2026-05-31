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
    }
});

/**
 * LIVE ma'lumotlar uchun (buyurtma holati kabi) — Next.js Data Cache'ni
 * chetlab o'tadigan alohida klient.
 *
 * ⚠️ NEGA ALOHIDA: oddiy `supabaseAdmin` ommaviy ISR sahifalarda ham ishlatiladi
 * (bosh sahifa, mahsulotlar, katalog — `export const revalidate`). Agar no-store'ni
 * GLOBAL qilsak, o'sha sahifalar ISR'dan chiqib, "Dynamic server usage" xatosi bilan
 * har so'rovda dinamik render bo'ladi (TTFB/SEO regressiyasi). Shuning uchun
 * no-store FAQAT shu klientda — uni faqat buyurtma o'qish endpointlari ishlatadi.
 */
export const supabaseAdminFresh = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    global: {
        fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' })
    }
});
