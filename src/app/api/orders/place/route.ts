import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { verifyJwt } from "@/lib/jwt-utils";
import { z } from "zod";
import { sendLowStockAlert } from "@/lib/telegram";

/**
 * Zod Schema for Order Validation
 */
const orderSchema = z.object({
    userPhone: z.string().min(9).max(15),
    items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().positive(),
        quantity: z.number().int().positive(),
        image: z.string().optional()
    })).min(1),
    total: z.number().positive(),
    address: z.string().min(5),
    coords: z.array(z.number()).length(2).optional().nullable(),
    promoCode: z.string().optional().nullable(),
    isWalletPayment: z.boolean().optional(),
    walletUsage: z.number().optional(),
    referralData: z.record(z.string(), z.string()).optional().nullable() // { productId: affiliateLinkSlug }
});

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        // 0. RATE LIMITING
        if (!await checkRateLimit(ip, 15, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish. Bir ozdan so'ng qayta urinib ko'ring." }, { status: 429 });
        }

        // 🛡 JWT AUTH CHECK
        const userToken = req.cookies.get('user_token')?.value;
        const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback_secret_key_123!";
        const payload = userToken ? await verifyJwt(userToken, JWT_SECRET) : null;

        const rawBody = await req.json();
        const rawItems = Array.isArray(rawBody.p_items) ? rawBody.p_items : [];
        const computedTotal = rawItems.reduce(
            (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
            0
        );
        const body = {
            userPhone: rawBody.p_user_phone,
            items: rawBody.p_items,
            total: computedTotal,
            address: rawBody.p_address,
            coords: rawBody.p_coords,
            promoCode: rawBody.p_promo_code,
            walletUsage: rawBody.p_wallet_usage,
            referralData: rawBody.p_referral_data
        };
        
        // 1. DATA VALIDATION (Zod)
        const validation = orderSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ 
                success: false, 
                message: "Ma'lumotlar noto'g'ri kiritilgan. Iltimos, barcha maydonlarni tekshiring.", 
                errors: validation.error.format() 
            }, { status: 400 });
        }

        const validatedData = validation.data;

        // 🛡 SECURITY: Verify phone ownership
        if (!payload || payload.sub !== validatedData.userPhone) {
            return NextResponse.json({ success: false, message: "Xavfsizlik tizimi: Noto'g'ri sessiya. Iltimos qayta tizimga kiring." }, { status: 401 });
        }

        // 🛡 NEW: Session Version Check (Logout on password change)
        const { data: dbUser } = await supabaseAdmin
            .from("users")
            .select("token_version")
            .eq("phone", validatedData.userPhone)
            .single();

        if (dbUser && dbUser.token_version !== payload.token_version) {
            return NextResponse.json({ 
                success: false, 
                message: "Sessiya muddati tugagan (Parol o'zgargan). Iltimos, qayta kiring." 
            }, { status: 401 });
        }

        // 2. Execute Atomic DB Transaction via Admin Client (Secure bypass)
        // Boshlang'ich holat: to'lovdan oldingi holat. Client lokalizatsiyalangan
        // qiymat yuborsa o'shani, aks holda o'zbekcha standart qiymatni yozamiz
        // (eski "pending" inglizcha qiymati endi ishlatilmaydi).
        const initialStatus =
            typeof rawBody.p_status === "string" && rawBody.p_status.trim()
                ? rawBody.p_status.trim()
                : "To'lov kutilmoqda";
        const { data, error } = await supabaseAdmin.rpc('place_order', {
            p_user_phone: validatedData.userPhone,
            p_items: validatedData.items,
            p_address: validatedData.address,
            p_coords: validatedData.coords || null,
            p_status: initialStatus,
            p_promo_code: validatedData.promoCode || null,
            p_wallet_usage: validatedData.walletUsage || 0
        });

        if (error) {
            console.error("Order RPC Error:", error);
            return NextResponse.json({ success: false, message: "Buyurtma berishda xatolik: " + error.message }, { status: 500 });
        }

        // --- NEW: Check Low Stock Alert ---
        try {
            const productIds = validatedData.items.map((i: any) => i.id);
            const { data: stockCheck } = await supabaseAdmin
                .from("products")
                .select("id, name, stock")
                .in("id", productIds);
            
            if (stockCheck) {
                const lowStockItems = stockCheck.filter(p => p.stock < 5);
                if (lowStockItems.length > 0) {
                    // Fonda (async) yuboriladi, foydalanuvchini kutttirmaydi
                    sendLowStockAlert(lowStockItems);
                }
            }
        } catch(e) {
            console.error("Low stock check error:", e);
        }
        // ----------------------------------

        // --- NEW: MLM AFFILIATE & PROMO CODE TRACKING ---
        try {
            const orderId = data.orderId;
            let promoAffiliateId = null;

            // 1. Check if Promo Code belongs to an Affiliate
            if (validatedData.promoCode) {
                const { data: promoData } = await supabaseAdmin
                    .from("affiliate_promo_codes")
                    .select("*, promo_code_tariffs(*)")
                    .eq("code", validatedData.promoCode.toUpperCase())
                    .single();
                
                if (promoData) {
                    promoAffiliateId = promoData.affiliate_id;
                    const tariff = promoData.promo_code_tariffs;
                    
                    // Calculate Reward for Affiliate
                    let rewardAmount = 0;
                    if (tariff.affiliate_reward_type === 'fixed_per_use') {
                        rewardAmount = tariff.affiliate_reward_value;
                    } else if (tariff.affiliate_reward_type === 'percent_of_final_price') {
                        rewardAmount = (validatedData.total * tariff.affiliate_reward_value) / 100;
                    } else if (tariff.affiliate_reward_type === 'percent_of_discount') {
                        const discount = tariff.type === 'fixed' ? tariff.discount_value : (validatedData.total * tariff.discount_value) / 100;
                        rewardAmount = (discount * tariff.affiliate_reward_value) / 100;
                    }

                    // Create Transaction for Promo Code Owner
                    await supabaseAdmin.from("affiliate_transactions").insert({
                        user_id: promoAffiliateId,
                        order_id: orderId,
                        status: 'pending',
                        amount: rewardAmount,
                        order_stage: 'Promo-kod ishlatildi'
                    });

                    // Update Promo Code stats
                    await supabaseAdmin.rpc('increment_promo_usage', { 
                        p_promo_id: promoData.id, 
                        p_earned: rewardAmount 
                    });
                }
            }

            // 2. If NO Promo Code was used, check for Referral Links (Standard MLM)
            if (!promoAffiliateId) {
                // Atributsiyani birlashtirish: server-side DB (cross-device) + cookie (joriy qurilma).
                // Last-click: cookie (eng yangi session) DB ustidan ustun turadi.
                const cookieRefs: Record<string, string> = (validatedData.referralData as any) || {};

                const { data: dbAttr } = await supabaseAdmin
                    .from("referral_attributions")
                    .select("product_id, slug")
                    .eq("user_phone", validatedData.userPhone);

                const merged: Record<string, string> = {};
                (dbAttr || []).forEach(a => { merged[a.product_id] = a.slug; });
                Object.entries(cookieRefs).forEach(([pid, slug]) => { merged[pid] = slug; }); // cookie ustun

                // Faqat shu buyurtmadagi mahsulotlar uchun
                const orderedIds = new Set(validatedData.items.map((i: any) => i.id));
                const referralData = Object.fromEntries(
                    Object.entries(merged).filter(([pid]) => orderedIds.has(pid))
                );

                for (const [prodId, slug] of Object.entries(referralData)) {
                    const { data: linkData } = await supabaseAdmin
                        .from("affiliate_links")
                        .select("user_id, id")
                        .eq("slug", slug)
                        .eq("product_id", prodId)
                        .single();

                    if (linkData) {
                        // Konversiya hisoblagichni oshirish (read-then-increment)
                        const { data: curLink } = await supabaseAdmin
                            .from("affiliate_links")
                            .select("conversions")
                            .eq("id", linkData.id)
                            .single();
                        await supabaseAdmin
                            .from("affiliate_links")
                            .update({ conversions: (curLink?.conversions || 0) + 1 })
                            .eq("id", linkData.id);

                        // Create pending commission transaction (amount=0, calculated on delivery)
                        await supabaseAdmin.from("affiliate_transactions").insert({
                            user_id: linkData.user_id,
                            order_id: orderId,
                            product_id: prodId,
                            status: 'pending',
                            amount: 0,
                            order_stage: 'Referal havola orqali'
                        });
                    }
                }
            }
        } catch (mlmError) {
            console.error("MLM/Promo Tracking Error:", mlmError);
        }
        // ------------------------------------------------

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Place Order API Error:", error);
        return NextResponse.json({ success: false, message: "Xatolik: " + error.message }, { status: 500 });
    }
}
