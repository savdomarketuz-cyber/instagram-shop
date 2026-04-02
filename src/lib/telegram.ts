import { supabaseAdmin } from "./supabase";

const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CUSTOMER_BOT_TOKEN = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

export async function sendOrderNotification(orderId: string, method: string) {
    try {
        const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
        if (!order) return;

        if (!ADMIN_BOT_TOKEN || !ADMIN_ID) return;

        const itemsText = order.items.map((i: any) => `- ${i.name} (x${i.quantity} ta)`).join('\n');
        
        let text = `🛍 <b>Yangi Buyurtma!</b>\n`;
        text += `🆔 ID: #${order.id}\n`;
        text += `📞 Mijoz: ${order.user_phone || "Mavjud emas"}\n`;
        text += `📍 Manzil: ${order.address || "Ko'rsatilmagan"}\n\n`;
        text += `📦 <b>Mahsulotlar:</b>\n${itemsText}\n\n`;
        text += `💰 <b>Jami summa:</b> ${Number(order.total).toLocaleString()} so'm\n`;
        text += `💳 <b>To'lov usuli:</b> ${method === 'click' ? "✅ Click orqali to'landi" : "💵 Naqd to'lov (Qabul qilinganda)"}`;

        await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ADMIN_ID, text, parse_mode: 'HTML' })
        });

        // Also notify the customer if they have a telegram_id
        await notifyCustomerOrder(order.user_phone, orderId);

    } catch(e) {
        console.error("Telegram notification error:", e);
    }
}

export async function notifyCustomerOrder(phone: string, orderId: string) {
    try {
        // Fetch user telegram_id
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('telegram_id')
            .eq('phone', phone)
            .single();

        if (!user || !user.telegram_id || !CUSTOMER_BOT_TOKEN) return;

        const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
        if (!order) return;

        const itemsText = order.items.map((i: any) => `- ${i.name} (x${i.quantity} ta)`).join('\n');

        let text = `🛍 <b>Buyurtmangiz qabul qilindi!</b>\n\n`;
        text += `🆔 Buyurtma raqami: #${order.id}\n`;
        text += `📦 <b>Mahsulotlar:</b>\n${itemsText}\n\n`;
        text += `💰 <b>Jami summa:</b> ${Number(order.total).toLocaleString()} so'm\n\n`;
        text += `<i>Yaqin orada operatorimiz siz bilan bog'lanadi. Rahmat!</i>`;

        await fetch(`https://api.telegram.org/bot${CUSTOMER_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: user.telegram_id, text, parse_mode: 'HTML' })
        });
    } catch(e) {
        console.error("Customer Telegram notification error:", e);
    }
}
