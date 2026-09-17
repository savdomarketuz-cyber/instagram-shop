import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";

/**
 * Foydalanuvchi tanlagan tilni (uz | ru) Supabase bazasiga va Cookie'ga saqlash
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const rawLang = body.language || body.lang;
        const language = (rawLang === "ru" ? "ru" : "uz") as "uz" | "ru";

        // 1. Foydalanuvchi telefon raqamini aniqlash
        const token = req.cookies.get("user_token")?.value;
        const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback_secret_key_123!";
        let tokenPhone: string | null = null;
        if (token) {
            try {
                const payload = await verifyJwt(token, JWT_SECRET);
                if (payload?.sub && payload.sub !== "ADMIN") tokenPhone = String(payload.sub);
            } catch {}
        }
        const userPhoneCookie = req.cookies.get("user_phone")?.value;
        const userPhone = body.phone || tokenPhone || userPhoneCookie || null;

        // 2. Agar foydalanuvchi mavjud bo'lsa, Supabase bazasiga yozish
        if (userPhone) {
            // A. user_interests jadvaliga saqlash (yoki yangilash)
            await supabaseAdmin.from("user_interests").upsert({
                id: userPhone,
                user_phone: userPhone,
                language: language,
                updated_at: new Date().toISOString()
            }, { onConflict: "id" }).then(() => {}).catch(() => {});

            // B. users jadvaliga urinish (agar ustun mavjud bo'lsa)
            await supabaseAdmin.from("users").update({
                language: language
            }).eq("phone", userPhone).then(() => {}).catch(() => {});

            // C. Telemetriya logiga yozish
            await supabaseAdmin.from("user_telemetry_logs").insert([{
                user_identifier: userPhone,
                event_type: "LANGUAGE_CHANGE",
                event_value: language,
                event_metadata: { language }
            }]).then(() => {}).catch(() => {});
        }

        // 3. Javob qaytarish va Cookie'larni yangilash (1 yil muddatga)
        const res = NextResponse.json({ success: true, language, userPhone: userPhone || null });

        const cookieOptions = {
            path: "/",
            maxAge: 365 * 24 * 60 * 60, // 1 yil
            sameSite: "lax" as const,
        };

        res.cookies.set("velari_lang", language, cookieOptions);
        res.cookies.set("NEXT_LOCALE", language, cookieOptions);

        return res;
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
