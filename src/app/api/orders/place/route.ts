import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        // 0. RATE LIMITING (15 orders per minute per IP)
        if (!checkRateLimit(ip, 15, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish. Bir ozdan so'ng qayta urinib ko'ring." }, { status: 429 });
        }

        const body = await req.json();
        const { p_user_phone, p_items, p_address, p_coords, p_status, p_promo_code, p_wallet_usage } = body;

        // 🛡 SECURITY: IN THE ABSENCE OF AUTH TOKENS, WE MUST AT LEAST PREVENT 
        // ANONYMOUS SCRIPT-BASED BULK ORDERING.
        // In a real app, you would verify a JWT token here.
        if (!p_user_phone) {
            return NextResponse.json({ success: false, message: "Telefon raqami talab qilinadi." }, { status: 400 });
        }

        // 1. Execute Atomic DB Transaction via Admin Client (Secure bypass)
        const { data, error } = await supabaseAdmin.rpc('place_order', {
            p_user_phone,
            p_items,
            p_address,
            p_coords,
            p_status,
            p_promo_code,
            p_wallet_usage
        });

        if (error) {
            console.error("Order RPC Error:", error);
            return NextResponse.json({ success: false, message: "Ichki xatolik: " + error.message }, { status: 500 });
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Place Order API Error:", error);
        return NextResponse.json({ success: false, message: "Xatolik: " + error.message }, { status: 500 });
    }
}
