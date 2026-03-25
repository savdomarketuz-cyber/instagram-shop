import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth-utils";

/**
 * Foydalanuvchi logini (Server-side)
 * Parollarni ochiq ko'rinishdan hash-ga o'tkazish (Auto-migration)
 */
export async function POST(req: NextRequest) {
    try {
        const { phone, password } = await req.json();

        if (!phone || !password) {
            return NextResponse.json({ error: "Phone and password required" }, { status: 400 });
        }

        // 1. Foydalanuvchini topish (Supabase orqali)
        const { data: user, error: findError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("phone", phone)
            .single();

        if (findError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const storedPassword = user.password;

        let isAuthenticated = false;
        let needsMigration = false;

        // 2. Parolni tekshirish
        // a) Ochiq matnli eski parol (Auto-migration uchun)
        if (storedPassword === password) {
            isAuthenticated = true;
            needsMigration = true;
        } 
        // b) Hash qilingan yangi parol
        else if (storedPassword === hashPassword(password)) {
            isAuthenticated = true;
        }

        if (!isAuthenticated) {
            // Brute-force oldini olish
            await new Promise(resolve => setTimeout(resolve, 500));
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        // 3. Auto-migration: Parolni hash-ga o'tkazish
        const updateData: any = {};
        if (needsMigration) {
            updateData.password = hashPassword(password);
        }

        // 4. IP va oxirgi kirishni yangilash
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(/, /)[0] : "Aniqlanmadi";

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
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
