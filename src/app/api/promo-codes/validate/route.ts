import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
    try {
        const { code, totalAmount, userPhone } = await req.json();

        if (!code) {
            return NextResponse.json({ success: false, error: "Promo kodni kiriting" }, { status: 400 });
        }

        const normalizedCode = code.trim().toUpperCase();

        // 1. Check standard promo codes first
        const { data: promo } = await supabaseAdmin
            .from("promo_codes")
            .select("*")
            .eq("code", normalizedCode)
            .single();

        if (promo) {
            // Activity check
            if (!promo.active) return NextResponse.json({ success: false, error: "Ushbu promo kod hozirda faol emas" });
            
            // Expiration check
            if (promo.expires_at && new Date(promo.expires_at).getTime() < new Date().getTime()) {
                return NextResponse.json({ success: false, error: "Ushbu promo kodning muddati tugagan" });
            }

            // Usage limit check (umumiy)
            if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
                return NextResponse.json({ success: false, error: "Ushbu promo koddan foydalanish limiti tugagan" });
            }

            // Per-user limit check (har bir foydalanuvchi uchun)
            if (promo.per_user_limit && promo.per_user_limit > 0) {
                if (!userPhone) {
                    return NextResponse.json({ success: false, error: "Promo kodni ishlatish uchun tizimga kiring" });
                }
                const { count } = await supabaseAdmin
                    .from("promo_redemptions")
                    .select("*", { count: "exact", head: true })
                    .eq("code", normalizedCode)
                    .eq("user_phone", userPhone);
                if ((count || 0) >= promo.per_user_limit) {
                    return NextResponse.json({
                        success: false,
                        error: promo.per_user_limit === 1
                            ? "Siz bu promo kodni allaqachon ishlatgansiz"
                            : `Siz bu promo kodni ${promo.per_user_limit} marta ishlatib bo'lgansiz`
                    });
                }
            }

            // Min amount check
            if (totalAmount && totalAmount < promo.min_order_amount) {
                return NextResponse.json({ 
                    success: false, 
                    error: `Minimal buyurtma miqdori ${promo.min_order_amount.toLocaleString()} so'm bo'lishi kerak` 
                });
            }

            let discount = promo.discount_type === 'fixed' 
                ? promo.discount_value 
                : (totalAmount * promo.discount_value) / 100;

            if (promo.discount_type === 'percent' && promo.max_discount_amount && discount > promo.max_discount_amount) {
                discount = promo.max_discount_amount;
            }

            return NextResponse.json({ success: true, discount, code: promo.code, isAffiliate: false });
        }

        // 2. Check for Advanced Affiliate Promo Code
        const { data: advPromo } = await supabaseAdmin
            .from("affiliate_promo_codes")
            .select("*, promo_code_tariffs(*)")
            .eq("code", normalizedCode)
            .single();

        if (advPromo && advPromo.is_active) {
            const tariff = advPromo.promo_code_tariffs;
            
            if (advPromo.usage_limit && advPromo.usage_count >= advPromo.usage_limit) {
                return NextResponse.json({ success: false, error: "Ushbu promo koddan foydalanish limiti tugagan" });
            }
            
            let discount = 0;
            if (tariff) {
                discount = tariff.type === 'fixed' 
                    ? tariff.discount_value 
                    : (totalAmount * tariff.discount_value) / 100;
            }

            return NextResponse.json({ 
                success: true, 
                discount, 
                code: advPromo.code, 
                isAffiliate: true,
                affiliateName: advPromo.title || "Hamkor" 
            });
        }

        // 3. Check for Legacy Affiliate Promo Code (Referral)
        const { data: affiliateUser } = await supabaseAdmin
            .from("users")
            .select("phone, name")
            .eq("affiliate_code", normalizedCode)
            .single();

        if (affiliateUser) {
            // ANTI-FRAUD: Cannot use your own referral code
            if (userPhone && userPhone === affiliateUser.phone) {
                return NextResponse.json({ success: false, error: "O'z referal kodingizdan foydalana olmaysiz" });
            }

            // Get affiliate settings
            const { data: settingsRow } = await supabaseAdmin
                .from("site_settings")
                .select("value")
                .eq("key", "affiliate_settings")
                .single();

            const settings = settingsRow?.value || { buyer_discount: 10000 };
            const discount = settings.buyer_discount || 0;

            return NextResponse.json({ 
                success: true, 
                discount, 
                code: normalizedCode, 
                isAffiliate: true,
                affiliateName: affiliateUser.name 
            });
        }

        return NextResponse.json({ success: false, error: "Bunday promo kod mavjud emas" });
    } catch (error: any) {
        console.error("Promo validation error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
