import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyCustomerOrder } from "@/lib/telegram";

export async function POST(req: Request) {
    try {
        const { orderId, status } = await req.json();

        // 1. Update order status
        const { data: order, error } = await supabaseAdmin
            .from("orders")
            .update({ status })
            .eq("id", orderId)
            .select("user_phone")
            .single();

        if (error) throw error;

        // 2. Notify customer via Telegram
        if (order?.user_phone) {
            await notifyCustomerStatusUpdate(order.user_phone, orderId, status);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Admin status update error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

async function notifyCustomerStatusUpdate(phone: string, orderId: string, status: string) {
    try {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('telegram_id')
            .eq('phone', phone)
            .single();

        if (!user || !user.telegram_id) return;

        const CUSTOMER_BOT_TOKEN = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
        if (!CUSTOMER_BOT_TOKEN) return;

        let statusText = status;
        let emoji = "ℹ️";

        if (status === "Yetkazilmoqda") {
            statusText = "yo'lga chiqdi 🚚";
            emoji = "🚚";
        } else if (status === "Yetkazildi") {
            statusText = "yetkazib berildi ✅";
            emoji = "✅";
        } else if (status === "Bekor qilingan") {
            statusText = "bekor qilindi ❌";
            emoji = "❌";
        } else if (status === "Kutilmoqda") {
            statusText = "tasdiqlanishni kutmoqda ⏳";
            emoji = "⏳";
        }

        const text = `${emoji} <b>Buyurtma holati o'zgardi!</b>\n\n` +
            `🆔 Buyurtma: #<code>${orderId.slice(0, 8)}</code>\n` +
            `📊 Holati: <b>${statusText}</b>\n\n` +
            `<i>Velari do'konini tanlaganingiz uchun rahmat!</i>`;

        await fetch(`https://api.telegram.org/bot${CUSTOMER_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: user.telegram_id,
                text,
                parse_mode: "HTML"
            }),
        });
    } catch (e) {
        console.error("Customer status notification error:", e);
    }
}
