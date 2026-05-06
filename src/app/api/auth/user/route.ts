import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/rate-limiter";
import { createJwt } from "@/lib/jwt-utils";

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


        const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback_secret_key_123!";
        const token = await createJwt({
            sub: user.phone,
            role: "user",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days
        }, JWT_SECRET);

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name || "Mijoz",
                username: user.username || "",
                isAdmin: user.is_admin || false
            }
        });

        response.cookies.set("user_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60,
            path: "/"
        });

        return response;

    } catch (error) {
        console.error("User Auth Error:", error);
        return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
    }
}
