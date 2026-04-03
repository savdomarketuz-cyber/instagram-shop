import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const { senderPhone, receiverPhone, amount, code } = await req.json();

        // 1. Verify OTP
        const { data: otp } = await supabase
            .from("wallet_otps")
            .select("*")
            .eq("phone", senderPhone)
            .eq("code", code)
            .gt("expires_at", new Date().toISOString())
            .single();
        
        if (!otp) {
            return NextResponse.json({ success: false, message: "Kod noto'g'ri yoki muddati tugagan" });
        }

        // 2. Execute Atomic DB Transaction (RPC)
        // This prevents double spending and ensures both balances update together.
        const { data, error } = await supabase.rpc('p2p_transfer', {
            sender_phone_val: senderPhone,
            receiver_phone_val: receiverPhone,
            amount_val: amount
        });

        if (error) {
            return NextResponse.json({ success: false, message: error.message });
        }

        if (data && !data.success) {
            return NextResponse.json({ success: false, message: data.message });
        }

        // 3. Clear OTP
        await supabase.from("wallet_otps").delete().eq("phone", senderPhone);

        // 4. Notify Participants via Telegram
        const BOT_TOKEN = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
        
        // Notify Sender
        const { data: sender } = await supabase.from("users").select("telegram_id").eq("phone", senderPhone).single();
        if (sender?.telegram_id) {
            const textSender = `💰 *O'TKAZMA YUBORILDI*\n\nSumma: -${amount.toLocaleString()} so'm\nKimga: ${receiverPhone}\n\n✅ Muvaffaqiyatli bajarildi.`;
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: sender.telegram_id, text: textSender, parse_mode: "Markdown" })
            });
        }

        // Notify Receiver
        const { data: receiver } = await supabase.from("users").select("telegram_id").eq("phone", receiverPhone).single();
        if (receiver?.telegram_id) {
            const textReceiver = `💰 *HISOBINGIZ TO'LDIRILDI*\n\nSumma: +${amount.toLocaleString()} so'm\nKimdan: ${senderPhone}\n\nCheck: #${Math.random().toString(36).substring(7).toUpperCase()}`;
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: receiver.telegram_id, text: textReceiver, parse_mode: "Markdown" })
            });
        }

        return NextResponse.json({ success: true, message: "Muvaffaqiyatli yakunlandi" });
    } catch (error) {
        console.error("Transfer Confirm Error:", error);
        return NextResponse.json({ success: false, message: "O'tkazma vaqtida xatolik yuz berdi" });
    }
}
