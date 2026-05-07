import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";

async function getUserFromToken(req: NextRequest) {
    const token = req.cookies.get("user_token")?.value;
    if (!token) return null;
    
    const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback_secret_key_123!";
    const payload = await verifyJwt(token, JWT_SECRET);
    if (!payload || !payload.sub) return null;
    
    return payload.sub; // This is the user's phone number
}

export async function GET(req: NextRequest) {
    const userPhone = await getUserFromToken(req);
    if (!userPhone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // 1. Get user affiliate details
        const { data: user, error: userError } = await supabaseAdmin
            .from("users")
            .select("phone, name, affiliate_code, real_balance")
            .eq("phone", userPhone)
            .single();

        if (userError || !user) throw userError || new Error("User not found");

        // 2. Get affiliate transactions (referrals)
        const { data: transactions, error: transError } = await supabaseAdmin
            .from("affiliate_transactions")
            .select("*")
            .eq("affiliate_phone", userPhone)
            .order("created_at", { ascending: false });

        if (transError) throw transError;

        // 3. Get withdrawal requests
        const { data: withdrawals, error: withError } = await supabaseAdmin
            .from("withdraw_requests")
            .select("*")
            .eq("user_phone", userPhone)
            .order("created_at", { ascending: false });

        if (withError) throw withError;

        // 4. Get affiliate settings from site_settings
        const { data: settingsRow } = await supabaseAdmin
            .from("site_settings")
            .select("value")
            .eq("key", "affiliate_settings")
            .single();

        const settings = settingsRow?.value || { 
            referrer_reward: 15000, 
            buyer_discount: 10000, 
            min_withdrawal: 50000 
        };

        return NextResponse.json({
            success: true,
            user,
            transactions,
            withdrawals,
            settings
        });

    } catch (error: any) {
        console.error("Affiliate User GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const userPhone = await getUserFromToken(req);
    if (!userPhone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { action, affiliate_code, amount, card_number } = await req.json();

        // ACTION: Update Affiliate Code
        if (action === "update_code") {
            if (!affiliate_code || affiliate_code.length < 3) {
                return NextResponse.json({ error: "Kod kamida 3 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
            }

            // Check if code is already taken
            const { data: existingUser } = await supabaseAdmin
                .from("users")
                .select("phone")
                .eq("affiliate_code", affiliate_code.toUpperCase())
                .neq("phone", userPhone)
                .single();

            if (existingUser) {
                return NextResponse.json({ error: "Bu kod allaqachon band" }, { status: 400 });
            }

            const { error: updateError } = await supabaseAdmin
                .from("users")
                .update({ affiliate_code: affiliate_code.toUpperCase() })
                .eq("phone", userPhone);

            if (updateError) throw updateError;
            return NextResponse.json({ success: true, message: "Hamkorlik kodi muvaffaqiyatli o'rnatildi" });
        }

        // ACTION: Withdrawal Request
        if (action === "withdraw") {
            if (!amount || !card_number) {
                return NextResponse.json({ error: "Summa va karta raqami zarur" }, { status: 400 });
            }

            // Get current balance
            const { data: user } = await supabaseAdmin
                .from("users")
                .select("real_balance")
                .eq("phone", userPhone)
                .single();

            if (!user || user.real_balance < amount) {
                return NextResponse.json({ error: "Mablag' yetarli emas" }, { status: 400 });
            }

            // Get min withdrawal from settings
            const { data: settingsRow } = await supabaseAdmin
                .from("site_settings")
                .select("value")
                .eq("key", "affiliate_settings")
                .single();
            
            const minWith = settingsRow?.value?.min_withdrawal || 50000;
            if (amount < minWith) {
                return NextResponse.json({ error: `Minimal yechish summasi: ${minWith.toLocaleString()} so'm` }, { status: 400 });
            }

            // Create request and deduct balance (ideally in a transaction)
            // For simplicity, we'll do it sequentially
            const { error: withError } = await supabaseAdmin
                .from("withdraw_requests")
                .insert({
                    user_phone: userPhone,
                    amount,
                    card_number,
                    status: "pending"
                });

            if (withError) throw withError;

            const { error: balError } = await supabaseAdmin
                .from("users")
                .update({ real_balance: user.real_balance - amount })
                .eq("phone", userPhone);

            if (balError) throw balError;

            return NextResponse.json({ success: true, message: "Yechish so'rovi yuborildi" });
        }

        return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });

    } catch (error: any) {
        console.error("Affiliate User POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
