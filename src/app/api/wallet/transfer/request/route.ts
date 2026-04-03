import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const { senderPhone, receiverPhone, amount } = await req.json();

        // 1. Basic validation
        if (!senderPhone || !receiverPhone || !amount || amount <= 0) {
            return NextResponse.json({ success: false, message: "Ma'lumotlar to'liq emas" });
        }

        // 2. Check Sender Balance
        const { data: wallet } = await supabase
            .from("user_wallets")
            .select("balance")
            .eq("phone", senderPhone)
            .single();
        
        if (!wallet || wallet.balance < amount) {
            return NextResponse.json({ success: false, message: "Mablag' yetarli emas" });
        }

        // 3. Find Receiver
        const { data: receiver } = await supabase
            .from("users")
            .select("id, name, telegram_id")
            .eq("phone", receiverPhone)
            .single();
        
        if (!receiver) {
            return NextResponse.json({ success: false, message: "Qabul qiluvchi topilmadi" });
        }

        // 4. Check Sender Telegram ID
        const { data: sender } = await supabase
            .from("users")
            .select("telegram_id")
            .eq("phone", senderPhone)
            .single();
        
        if (!sender || !sender.telegram_id) {
            return NextResponse.json({ success: false, message: "Tasdiqlash uchun Telegram botdan ro'yxatdan o'tishingiz kerak (@VELARI_CUSTOMER_BOT)" });
        }

        // 5. Generate OTP Code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

        // 6. Save OTP to DB
        await supabase.from("wallet_otps").delete().eq("phone", senderPhone); // Overwrite old codes
        await supabase.from("wallet_otps").insert([{
            phone: senderPhone,
            code: code,
            expires_at: expiresAt
        }]);

        // 7. Send via Telegram Bot
        const BOT_TOKEN = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
        const text = `🏦 *O'TKAZMANI TASDIQLASH*\n\n💰 Summa: ${amount.toLocaleString()} so'm\n👤 Kimga: ${receiver.name} (${receiverPhone})\n\n🔐 Tasdiqlash kodi: \`${code}\`\n\n🕒 Amal qilish muddati: 5 daqiqa. Hech kimga bermang!`;

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: sender.telegram_id,
                text: text,
                parse_mode: "Markdown"
            })
        });

        return NextResponse.json({ success: true, message: "Kod Telegramga yuborildi" });
    } catch (error) {
        console.error("Transfer Request Error:", error);
        return NextResponse.json({ success: false, message: "Kutilmagan xatolik yuz berdi" });
    }
}
