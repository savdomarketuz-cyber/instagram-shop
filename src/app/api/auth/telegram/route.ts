import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

/**
 * Telegram Auth Widget ma'lumotlarini tekshirish
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, first_name, last_name, username, photo_url, auth_date, hash } = body;

        if (!hash || !id) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // 1. Hash tekshirish logic (Security critical!)
        const botToken = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
        if (!botToken) return NextResponse.json({ error: "Server config error" }, { status: 500 });

        const dataCheckArr = [];
        for (const [key, value] of Object.entries(body)) {
            if (key !== 'hash' && value) {
                dataCheckArr.push(`${key}=${value}`);
            }
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        const secretKey = crypto.createHash('sha256').update(botToken).digest();
        const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (hmac !== hash) {
            return NextResponse.json({ error: "Auth verification failed" }, { status: 401 });
        }

        // 2. Foydalanuvchini topish yoki yaratish
        const telegramIdStr = id.toString();
        
        let { data: user, error: findError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("telegram_id", telegramIdStr)
            .single();

        if (!user) {
            // Agar bunday telegram_id bo'lmasa, yangi foydalanuvchi yaratish (phone so'ralishi kerak bo'ladi keyingi bosqichda)
            // Lekin bu yerda shunchaki vaqtinchalik name va telegram_id bilan yaratamiz
            const { data: newUser, error: createError } = await supabaseAdmin
                .from("users")
                .insert({
                    id: crypto.randomUUID(),
                    telegram_id: telegramIdStr,
                    name: `${first_name} ${last_name || ""}`.trim() || username || "Telegram User",
                    username: username || "",
                    last_login: new Date().toISOString()
                })
                .select()
                .single();
            
            if (createError) throw createError;
            user = newUser;
        } else {
            // Mavjud foydalanuvchini yangilash
            await supabaseAdmin.from("users").update({
                last_login: new Date().toISOString(),
                username: username || user.username
            }).eq("id", user.id);
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                phone: user.phone || "Telefon kiritilmagan",
                name: user.name || "Mijoz",
                username: user.username || "",
                isAdmin: user.is_admin || false
            }
        });

    } catch (error) {
        console.error("Telegram Login Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
