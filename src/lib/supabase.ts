import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' })
    }
});

// supabaseAdmin endi alohida faylda: src/lib/supabase-admin.ts
// Faqat server-side (API routes, Server Components) da import qiling

