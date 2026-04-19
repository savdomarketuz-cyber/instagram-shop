import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        if (!checkRateLimit(ip, 3, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish." }, { status: 429 });
        }

        const { order_id, user_phone, items, reason } = await req.json();

        if (!order_id || !user_phone || !items || !reason) {
            return NextResponse.json({ success: false, message: "Barcha maydonlarni to'ldiring." }, { status: 400 });
        }

        // 🛡 SECURITY: Verify ownership before allowing a return request
        const { data: order } = await supabaseAdmin
            .from("orders")
            .select("user_phone, status")
            .eq("id", order_id)
            .single();

        if (!order || order.user_phone !== user_phone) {
            return NextResponse.json({ success: false, message: "Ruxsat etilmadi." }, { status: 403 });
        }

        // 1. Insert Return Request
        const { error } = await supabaseAdmin.from("order_returns").insert({
            order_id,
            user_phone,
            items,
            reason,
            status: "Kutilmoqda",
            created_at: new Date().toISOString()
        });

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
