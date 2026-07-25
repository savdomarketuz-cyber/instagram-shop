import { NextResponse } from "next/server";
import { sendSupportReplyToCustomer } from "@/lib/telegram";

const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}`;

async function sendAdminMessage(chatId: number | string, text: string) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML"
        }),
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!body.message) return NextResponse.json({ ok: true });

        const { chat, text, reply_to_message } = body.message;
        const adminChatId = chat.id;

        if (!text) return NextResponse.json({ ok: true });

        let targetCustomerChatId: string | null = null;
        let replyText = "";

        // 1. Command syntax: /reply <chat_id> <text>
        if (text.startsWith("/reply ")) {
            const parts = text.slice(7).trim().split(" ");
            if (parts.length >= 2) {
                targetCustomerChatId = parts[0];
                replyText = parts.slice(1).join(" ");
            }
        }
        // 2. Reply to message syntax: Admin replies directly to forwarded customer message
        else if (reply_to_message && reply_to_message.text) {
            const match = reply_to_message.text.match(/Telegram ID:\s*(\d+)/i);
            if (match && match[1]) {
                targetCustomerChatId = match[1];
                replyText = text;
            }
        }

        if (targetCustomerChatId && replyText) {
            const success = await sendSupportReplyToCustomer(targetCustomerChatId, replyText);
            if (success) {
                await sendAdminMessage(adminChatId, `✅ <b>Javob mijozga yuborildi!</b>\n\n🆔 Chat ID: <code>${targetCustomerChatId}</code>`);
            } else {
                await sendAdminMessage(adminChatId, `❌ <b>Xatolik!</b> Javobni mijozga yuborib bo'lmadi. Bot bloklangan yoki Chat ID noto'g'ri bo'lishi mumkin.`);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Admin Bot Route Error:", error);
        return NextResponse.json({ ok: true });
    }
}
