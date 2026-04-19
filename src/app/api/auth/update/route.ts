import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { hashPassword } from "@/lib/auth-utils";

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        if (!checkRateLimit(ip, 5, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish." }, { status: 429 });
        }

        const { phone, password, name, username } = await req.json();

        if (!phone || !password) {
            return NextResponse.json({ success: false, message: "Telefon raqami va parol zarur." }, { status: 400 });
        }

        // 🛡 SECURITY: Verify Identity
        const { data: user, error: findError } = await supabaseAdmin
            .from("users")
            .select("password")
            .eq("phone", phone)
            .single();

        if (findError || !user) {
            return NextResponse.json({ success: false, message: "Foydalanuvchi topilmadi." }, { status: 404 });
        }

        // Check if password is correct (supporting migration)
        const isAuth = user.password === password || user.password === hashPassword(password);
        if (!isAuth) {
            return NextResponse.json({ success: false, message: "Tasdiqlash xatosi (Ruxsat yo'q)." }, { status: 401 });
        }

        // 🛡 SECURITY: Verify Username Availability (server-side)
        if (username) {
            const { data: existing } = await supabaseAdmin
                .from("users")
                .select("phone")
                .eq("username", username)
                .neq("phone", phone)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ success: false, message: "Ushbu username band." }, { status: 400 });
            }
        }

        const { error } = await supabaseAdmin
            .from("users")
            .update({ name, username, updated_at: new Date().toISOString() })
            .eq("phone", phone);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
