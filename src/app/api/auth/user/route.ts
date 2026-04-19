import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * Foydalanuvchi logini (Server-side)
 * Parollarni ochiq ko'rinishdan hash-ga o'tkazish (Auto-migration)
 */
export async function POST(req: NextRequest) {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/, /)[0] : "unknown";

    try {
        // 🛡 Brute-force protection: 5 attempts per minute
        if (!checkRateLimit(ip, 5, 60)) {
            return NextResponse.json({ error: "Juda ko'p urinish. Iltimos 1 daqiqadan so'ng qayta urining." }, { status: 429 });
        }

        const { phone, password } = await req.json();

        if (!phone || !password) {
            return NextResponse.json({ error: "Telefon va parol zarur" }, { status: 400 });
        }

        // 1. Foydalanuvchini topish (Supabase orqali)
        const { data: user, error: findError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("phone", phone)
            .single();

        if (findError || !user) {
            // Secure delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 1000));
            return NextResponse.json({ error: "Telefon raqami yoki parol noto'g'ri" }, { status: 401 });
        }

        const storedPassword = user.password;
        let isAuthenticated = false;
        let needsMigration = false;

        // 2. Xavfsiz tekshiruv
        // Agar kiritilgan parol bazadagi hashga teng bo'lsa lekin u hash emas plain text bo'lsa (uzunligi < 32)
        if (storedPassword === password && password.length < 32) {
            isAuthenticated = true;
            needsMigration = true;
        } 
        else if (storedPassword === hashPassword(password)) {
            isAuthenticated = true;
        }

        if (!isAuthenticated) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return NextResponse.json({ error: "Telefon raqami yoki parol noto'g'ri" }, { status: 401 });
        }

        // 3. Auto-migration
        const updateData: any = {};
        if (needsMigration) {
            updateData.password = hashPassword(password);
        }

        updateData.ip_address = ip;
        updateData.last_login = new Date().toISOString();

        await supabaseAdmin
            .from("users")
            .update(updateData)
            .eq("id", user.id);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name || "Mijoz",
                username: user.username || "",
                isAdmin: user.is_admin || false
            }
        });

    } catch (error) {
        console.error("User Auth Error:", error);
        return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
    }
}
