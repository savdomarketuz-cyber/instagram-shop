import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";
import { sendCartReminder } from "@/lib/telegram";
import crypto from "crypto";
import webpush from "web-push";

// Foydalanuvchining sayt ichidagi (support) chatiga admin xabarini yozish
async function sendInAppMessage(phone: string, text: string) {
    await supabaseAdmin.from("support_messages").insert([{
        id: crypto.randomUUID(),
        chat_id: phone,
        text,
        sender_id: "admin",
        sender_type: "admin",
        is_admin: true,
        created_at: new Date().toISOString(),
    }]);
    await supabaseAdmin.from("support_chats").upsert({
        id: phone,
        last_message: text,
        last_timestamp: new Date().toISOString(),
        status: "active",
        unread_by_admin: 0,
    });
}

// Foydalanuvchining qurilmasiga web-push (PWA) yuborish
async function sendWebPushToPhone(phone: string, title: string, body: string, url: string) {
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;
    if (!pubKey || !privKey) return;
    try {
        webpush.setVapidDetails("mailto:admin@velari.uz", pubKey, privKey);
        const { data: tokens } = await supabaseAdmin
            .from("fcm_tokens")
            .select("token")
            .eq("user_phone", phone);
        const payload = JSON.stringify({ title, body, url });
        await Promise.all((tokens || []).map(async (row: any) => {
            try {
                await webpush.sendNotification(JSON.parse(row.token), payload);
            } catch (err: any) {
                if (err?.statusCode === 410 || err?.statusCode === 404) {
                    await supabaseAdmin.from("fcm_tokens").delete().eq("token", row.token);
                }
            }
        }));
    } catch { /* push xatosi jim qoladi */ }
}

async function verifyAdmin(req: NextRequest) {
    const adminToken = req.cookies.get("admin_token")?.value;
    const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim();
    if (!ADMIN_SECRET || !adminToken) return false;
    const payload = await verifyJwt(adminToken, ADMIN_SECRET);
    return payload && payload.role === "admin";
}

export async function GET(req: NextRequest) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Fetch active carts that have items in them
        const { data: carts, error } = await supabaseAdmin
            .from("active_carts")
            .select(`
                user_phone,
                items,
                updated_at,
                users ( name, telegram_id )
            `)
            .order("updated_at", { ascending: false });

        if (error) throw error;

        // Filter carts that actually have items
        const validCarts = carts?.filter(cart => 
            cart.items && 
            Array.isArray(cart.items) && 
            cart.items.length > 0 && 
            cart.user_phone !== "anonymous"
        ) || [];

        return NextResponse.json({ success: true, carts: validCarts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { phone, items } = await req.json();

        if (!phone || !items || items.length === 0) {
            return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
        }

        const count = Array.isArray(items) ? items.length : 0;
        const reminderText = `🛒 Savatingizda ${count} ta mahsulot kutib turibdi! Ularni unutmang — hoziroq xarid qiling. 💚`;

        // Barcha kanallarga parallel yuboramiz (biror kanal ishlamasa ham, qolganlari ishlaydi)
        const [tgResult] = await Promise.allSettled([
            sendCartReminder(phone, items),                 // Telegram
            sendInAppMessage(phone, reminderText),          // Sayt/PWA ichidagi chat
            sendWebPushToPhone(phone, "Velari — Savatingiz", reminderText, "/uz/cart"), // Web push
        ]);

        const tgOk = tgResult.status === "fulfilled" && (tgResult.value as any)?.success;

        // Sayt ichidagi xabar har doim yoziladi — shuning uchun muvaffaqiyat deb hisoblaymiz
        return NextResponse.json({
            success: true,
            message: tgOk ? "Eslatma yuborildi (Telegram + sayt)" : "Eslatma sayt/PWA orqali yuborildi",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
