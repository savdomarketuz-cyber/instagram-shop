import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
    try {
        const { code, totalAmount } = await req.json();

        if (!code) {
            return NextResponse.json({ success: false, error: "Promo kodni kiriting" }, { status: 400 });
        }

        const { data: promo, error } = await supabaseAdmin
            .from("promo_codes")
            .select("*")
            .eq("code", code.trim().toUpperCase())
            .single();

        if (error || !promo) {
            return NextResponse.json({ success: false, error: "Bunday promo kod mavjud emas" });
        }

        // 1. Activity check
        if (!promo.active) {
            return NextResponse.json({ success: false, error: "Ushbu promo kod hozirda faol emas" });
        }

        // 2. Expiration check
        if (promo.expires_at) {
            const expiresAt = new Date(promo.expires_at).getTime();
            const now = new Date().getTime();
            if (expiresAt < now) {
                return NextResponse.json({ success: false, error: "Ushbu promo kodning muddati tugagan" });
            }
        }

        // 3. Usage limit check
        if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
            return NextResponse.json({ success: false, error: "Ushbu promo koddan foydalanish limiti tugagan" });
        }

        // 4. Min amount check
        if (totalAmount && totalAmount < promo.min_order_amount) {
            return NextResponse.json({ 
                success: false, 
                error: `Minimal buyurtma miqdori ${promo.min_order_amount.toLocaleString()} so'm bo'lishi kerak` 
            });
        }

        // 5. Calculate discount
        let discount = 0;
        if (promo.discount_type === 'fixed') {
            discount = promo.discount_value;
        } else if (promo.discount_type === 'percent') {
            discount = (totalAmount * promo.discount_value) / 100;
            if (promo.max_discount_amount && discount > promo.max_discount_amount) {
                discount = promo.max_discount_amount;
            }
        }

        return NextResponse.json({ 
            success: true, 
            discount, 
            code: promo.code,
            type: promo.discount_type,
            value: promo.discount_value
        });
    } catch (error: any) {
        console.error("Promo validation error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
