import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pingSitemapToGoogle } from "@/lib/google-indexing";
import { sendCartReminder } from "@/lib/telegram";

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Muddati o'tgan buyurtmalarni tozalash
        const { error } = await supabaseAdmin.rpc('restore_expired_orders');
        if (error) throw error;

        // 2. Google sitemap ping — har kuni xabar berish
        const sitemapPinged = await pingSitemapToGoogle();

        // 3. 🛒 Savat tashlab ketganlar eslatmasi
        // 24 soat oldin savat yangilangan, lekin buyurtma bermaganlarga xabar
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data: abandonedCarts } = await supabaseAdmin
            .from("user_carts")
            .select("user_phone, items, updated_at")
            .lt("updated_at", oneDayAgo)
            .gt("updated_at", twoDaysAgo)
            .not("items", "eq", "[]");

        let cartRemindersSent = 0;
        if (abandonedCarts && abandonedCarts.length > 0) {
            for (const cart of abandonedCarts) {
                // Foydalanuvchi so'nggi 24 soatda buyurtma bermaganligini tekshirish
                const { data: recentOrder } = await supabaseAdmin
                    .from("orders")
                    .select("id")
                    .eq("user_phone", cart.user_phone)
                    .gt("created_at", oneDayAgo)
                    .limit(1)
                    .single();

                if (!recentOrder) {
                    const result = await sendCartReminder(cart.user_phone, cart.items || []);
                    if (result?.success) cartRemindersSent++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: "Cron tasks completed",
            sitemapPinged,
            cartRemindersSent
        });
    } catch(e: any) {
        console.error("Cron Error: ", e);
        return NextResponse.json({ success: false, error: e.message });
    }
}
