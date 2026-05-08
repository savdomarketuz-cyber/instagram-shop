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
        const body = {
            userPhone: rawBody.p_user_phone,
            items: rawBody.p_items,
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
        const { data, error } = await supabaseAdmin.rpc('place_order', {
            p_user_phone: validatedData.userPhone,
            p_items: validatedData.items,
            p_address: validatedData.address,
            p_coords: validatedData.coords || null,
            p_status: 'pending',
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

        // --- MLM AFFILIATE TRACKING ---
        if (validatedData.referralData && Object.keys(validatedData.referralData).length > 0) {
            try {
                const orderId = data.orderId;
                for (const [prodId, slug] of Object.entries(validatedData.referralData)) {
                    const { data: linkData } = await supabaseAdmin
                        .from("affiliate_links")
                        .select("user_id")
                        .eq("slug", slug)
                        .eq("product_id", prodId)
                        .single();
                    
                    if (linkData) {
                        await supabaseAdmin.from("affiliate_transactions").insert({
                            user_id: linkData.user_id,
                            order_id: orderId,
                            product_id: prodId,
                            status: 'pending',
                            amount: 0,
                            order_stage: 'Yaratildi'
                        });
                    }
                }
            } catch (mlmError) {
                console.error("MLM Tracking Error:", mlmError);
            }
        }
        // ------------------------------

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Place Order API Error:", error);
        return NextResponse.json({ success: false, message: "Xatolik: " + error.message }, { status: 500 });
    }
}
