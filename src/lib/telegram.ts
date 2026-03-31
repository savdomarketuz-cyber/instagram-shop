import { supabaseAdmin } from "./supabase";

export async function sendOrderNotification(orderId: string, method: string) {
    try {
        const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
        if (!order) return;

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_ADMIN_ID;
        if (!botToken || !chatId) return;

        const itemsText = order.items.map((i: any) => `- ${i.name} (x${i.quantity} ta)`).join('\n');
        
        let text = `🛍 <b>Yangi Buyurtma!</b>\n`;
        text += `🆔 ID: #${order.id}\n`;
        text += `📞 Mijoz: ${order.user_phone || "Mavjud emas"}\n`;
        text += `📍 Manzil: ${order.address || "Ko'rsatilmagan"}\n\n`;
        text += `📦 <b>Mahsulotlar:</b>\n${itemsText}\n\n`;
        text += `💰 <b>Jami summa:</b> ${Number(order.total).toLocaleString()} so'm\n`;
        text += `💳 <b>To'lov usuli:</b> ${method === 'click' ? "✅ Click orqali to'landi" : "💵 Naqd to'lov (Qabul qilinganda)"}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
        });
    } catch(e) {
        console.error("Telegram notification error:", e);
    }
}
