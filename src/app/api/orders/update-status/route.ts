import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        // 0. RATE LIMITING
        if (!checkRateLimit(ip, 5, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish." }, { status: 429 });
        }

        const { orderId, status, paymentMethod, userPhone } = await req.json();

        if (!orderId || !userPhone) {
            return NextResponse.json({ success: false, message: "Ma'lumotlar yetarli emas." }, { status: 400 });
        }

        // 🛡 SECURITY CHECK: Verify that the order belongs to the user
        // In a production app, verify this using a JWT session token.
        const { data: order, error: findError } = await supabaseAdmin
            .from("orders")
            .select("user_phone")
            .eq("id", orderId)
            .single();

        if (findError || !order) {
            return NextResponse.json({ success: false, message: "Buyurtma topilmadi." }, { status: 404 });
        }

        if (order.user_phone !== userPhone) {
            return NextResponse.json({ success: false, message: "Ruxsat etilmadi (Not your order)." }, { status: 403 });
        }

        // 1. Update Order Status
        const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({
                status: status,
                payment_method: paymentMethod,
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Order Update API Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
