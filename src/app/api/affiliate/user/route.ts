import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";
import crypto from "crypto";

function hashPin(pin: string) {
    return crypto.createHash('sha256').update(pin).digest('hex');
}

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
        // 1. Get user details including MLM role and status
        const { data: user, error: userError } = await supabaseAdmin
            .from("users")
            .select("id, phone, name, affiliate_code, real_balance, affiliate_role, affiliate_pin, affiliate_agreed, upline_id")
            .eq("phone", userPhone)
            .single();

        if (userError || !user) throw userError || new Error("User not found");

        // 1a. Get Cashback Wallet Balance
        const { data: wallet } = await supabaseAdmin
            .from("user_wallets")
            .select("balance")
            .eq("user_phone", userPhone)
            .single();

        const wallet_balance = wallet?.balance || 0;

        // 2. Get Team Members (Downline)
        const { data: teamMembers } = await supabaseAdmin
            .from("users")
            .select("id, phone, name, affiliate_role, created_at")
            .eq("upline_id", user.id);

        // 3. Get Affiliate Transactions (Frozen/Pending/Released)
        const { data: transactions } = await supabaseAdmin
            .from("affiliate_transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        // 4. Get Withdrawal History
        const { data: withdrawals } = await supabaseAdmin
            .from("withdraw_requests")
            .select("*")
            .eq("user_phone", userPhone)
            .order("created_at", { ascending: false });

        return NextResponse.json({
            success: true,
            user: {
                ...user,
                wallet_balance,
                hasPin: !!user.affiliate_pin,
                affiliate_pin: undefined // Don't send hash to client
            },
            team: teamMembers || [],
            transactions: transactions || [],
            withdrawals: withdrawals || []
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
        const body = await req.json();
        const { action, pin, amount, card_number, memberPhone, verificationCode, productId } = body;

        // --- PIN SETUP ---
        if (action === "set_pin") {
            if (!pin || pin.length !== 4) return NextResponse.json({ error: "PIN 4 ta raqam bo'lishi kerak" }, { status: 400 });
            const hashedPin = hashPin(pin);
            await supabaseAdmin.from("users").update({ affiliate_pin: hashedPin }).eq("phone", userPhone);
            return NextResponse.json({ success: true });
        }

        // --- PIN VERIFY ---
        if (action === "verify_pin") {
            const { data: user } = await supabaseAdmin.from("users").select("affiliate_pin").eq("phone", userPhone).single();
            if (!user?.affiliate_pin) return NextResponse.json({ error: "PIN o'rnatilmagan" }, { status: 400 });
            const isValid = hashPin(pin) === user.affiliate_pin;
            if (!isValid) return NextResponse.json({ error: "Noto'g'ri PIN" }, { status: 400 });
            return NextResponse.json({ success: true });
        }

        // --- AGREE CONTRACT ---
        if (action === "agree_contract") {
            await supabaseAdmin.from("users").update({ affiliate_agreed: true, affiliate_role: 'top_manager' }).eq("phone", userPhone);
            return NextResponse.json({ success: true });
        }

        // --- TRANSFER TO CASHBACK ---
        if (action === "transfer_to_cashback") {
            const { data: user } = await supabaseAdmin.from("users").select("id, real_balance").eq("phone", userPhone).single();
            if (!user || user.real_balance < amount) return NextResponse.json({ error: "Mablag' yetarli emas" }, { status: 400 });
            
            // 1. Deduct from real balance
            await supabaseAdmin.from("users").update({ 
                real_balance: Number(user.real_balance) - Number(amount)
            }).eq("phone", userPhone);

            // 2. Add to user_wallets
            const { data: wallet } = await supabaseAdmin.from("user_wallets").select("balance").eq("user_phone", userPhone).single();
            if (wallet) {
                await supabaseAdmin.from("user_wallets").update({ 
                    balance: Number(wallet.balance) + Number(amount)
                }).eq("user_phone", userPhone);
            } else {
                // Create wallet if not exists
                await supabaseAdmin.from("user_wallets").insert({
                    user_phone: userPhone,
                    balance: amount,
                    wallet_number: userPhone.replace("+", "")
                });
            }

            return NextResponse.json({ success: true });
        }

        // --- ADD TEAM MEMBER ---
        if (action === "add_team_member") {
            // 1. Get current user's role and ID
            const { data: currentUser } = await supabaseAdmin.from("users").select("id, affiliate_role").eq("phone", userPhone).single();
            if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

            // 2. Check team size limit (max 10)
            const { count } = await supabaseAdmin.from("users").select("*", { count: 'exact', head: true }).eq("upline_id", currentUser.id);
            if (count && count >= 10) return NextResponse.json({ error: "Maksimal jamoa a'zolari soniga yetildi (10)" }, { status: 400 });

            // 3. Find the new member by phone
            const { data: newMember } = await supabaseAdmin.from("users").select("id, phone, upline_id").eq("phone", memberPhone).single();
            if (!newMember) return NextResponse.json({ error: "Foydalanuvchi topilmadi. Avval u ro'yxatdan o'tishi kerak." }, { status: 404 });
            if (newMember.upline_id) return NextResponse.json({ error: "Ushbu foydalanuvchi allaqachon jamoada" }, { status: 400 });

            // 4. Verification Logic (Placeholder for Telegram code)
            // In a real scenario, you'd check a redis/db stored code sent via bot
            if (verificationCode !== "1234") { // Mock code for now
                 return NextResponse.json({ error: "Noto'g'ri tasdiqlash kodi" }, { status: 400 });
            }

            // 5. Determine new role
            let newRole: string = 'agent';
            if (currentUser.affiliate_role === 'top_manager') newRole = 'sales_manager';
            else if (currentUser.affiliate_role === 'sales_manager' || currentUser.affiliate_role === 'top_sales_manager') newRole = 'agent';

            await supabaseAdmin.from("users").update({ 
                upline_id: currentUser.id,
                affiliate_role: newRole,
                affiliate_agreed: true 
            }).eq("id", newMember.id);

            // 6. Upgrade current user if they become Top Sales Manager
            if (currentUser.affiliate_role === 'sales_manager' && newRole === 'agent') {
                await supabaseAdmin.from("users").update({ affiliate_role: 'top_sales_manager' }).eq("id", currentUser.id);
            }

            return NextResponse.json({ success: true });
        }

        // --- CREATE REFERRAL LINK ---
        if (action === "create_link") {
            const { data: user } = await supabaseAdmin.from("users").select("id").eq("phone", userPhone).single();
            const slug = Math.random().toString(36).substring(2, 10).toUpperCase();
            await supabaseAdmin.from("affiliate_links").insert({
                user_id: user?.id,
                product_id: productId,
                slug
            });
            return NextResponse.json({ success: true, slug });
        }

        // --- WITHDRAW ---
        if (action === "withdraw") {
             // Re-use existing withdraw logic from previous version
             const { data: user } = await supabaseAdmin.from("users").select("real_balance").eq("phone", userPhone).single();
             if (!user || user.real_balance < amount) return NextResponse.json({ error: "Mablag' yetarli emas" }, { status: 400 });

             await supabaseAdmin.from("withdraw_requests").insert({
                user_phone: userPhone,
                amount,
                card_number,
                status: "pending"
             });

             await supabaseAdmin.from("users").update({ real_balance: user.real_balance - amount }).eq("phone", userPhone);
             return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("Affiliate User POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
