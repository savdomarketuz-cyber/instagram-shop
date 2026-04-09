import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendTransferOTP } from "@/lib/telegram";

export async function POST(req: Request) {
    try {
        const { senderPhone, receiverPhone, amount, isGift } = await req.json();

        if (!senderPhone || !receiverPhone || !amount || amount < 1000) {
            return NextResponse.json({ success: false, message: "Minimal o'tkazma: 1 000 so'm" });
        }

        if (senderPhone === receiverPhone) {
            return NextResponse.json({ success: false, message: "O'zingizga o'tkazma qila olmaysiz" });
        }

        // 1. Check Sender (Balance + Telegram)
        const { data: sender } = await supabaseAdmin
            .from("users")
            .select("telegram_id, user_wallets(balance)")
            .eq("phone", senderPhone)
            .single();
        
        if (!sender || !sender.telegram_id) {
            return NextResponse.json({ success: false, message: "Tasdiqlash kodi uchun avval Telegram botdan ro'yxatdan o'te" });
        }

        const balance = (sender as any).user_wallets?.[0]?.balance || 0;
        if (balance < amount) {
            return NextResponse.json({ success: false, message: "Mablag' yetarli emas" });
        }

        // 2. Check Receiver
        const { data: receiver } = await supabaseAdmin
            .from("user_wallets")
            .select("user_phone")
            .eq("user_phone", receiverPhone)
            .single();
        
        if (!receiver) {
            return NextResponse.json({ success: false, message: "Qabul qiluvchi hamyoni topilmadi" });
        }

        // 3. Generate Secure OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        // 4. Bind OTP to this specific transaction
        await supabaseAdmin.from("p2p_otps").delete().eq("sender_phone", senderPhone); // Clean old
        await supabaseAdmin.from("p2p_otps").insert([{
            sender_phone: senderPhone,
            receiver_phone: receiverPhone,
            amount: amount,
            code: code,
            is_gift: isGift || false,
            expires_at: expiresAt
        }]);

        // 5. Send via Telegram util
        await sendTransferOTP(senderPhone, amount, receiverPhone, code);

        return NextResponse.json({ success: true, message: "Kod Telegramga yuborildi" });
    } catch (error) {
        console.error("Transfer Request Error:", error);
        return NextResponse.json({ success: false, message: "Xatolik yuz berdi" });
    }
}
