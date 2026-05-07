import { supabaseAdmin } from "./supabase-admin";

const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const CUSTOMER_BOT_TOKEN = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
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

export async function sendOrderStatusNotification(orderId: string, newStatus: string) {
    try {
        const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
        if (!order || !order.user_phone) return;

        const { data: user } = await supabaseAdmin
            .from('users')
            .select('telegram_id')
            .eq('phone', order.user_phone)
            .single();

        if (!user || !user.telegram_id || !CUSTOMER_BOT_TOKEN) return;

        let statusText = newStatus;
        if (newStatus === 'yolda' || newStatus === 'yo\'lda') statusText = '🚚 Yetkazib berilmoqda';
        else if (newStatus === 'yetkazildi') statusText = '✅ Yetkazib berildi';
        else if (newStatus === 'bekor_qilindi') statusText = '❌ Bekor qilindi';
        else if (newStatus === 'qabul_qilindi') statusText = '📦 Qabul qilindi va tayyorlanmoqda';

        let text = `📦 <b>Buyurtma holati o'zgardi!</b>\n\n`;
        text += `🆔 Buyurtma raqami: #${order.id}\n`;
        text += `🆕 Yangi holat: <b>${statusText}</b>\n\n`;
        
        if (newStatus === 'yolda' || newStatus === 'yo\'lda') {
            text += `<i>Kuryer yaqin orada siz bilan bog'lanadi. Iltimos, aloqada bo'ling!</i>`;
        }

        await fetch(`https://api.telegram.org/bot${CUSTOMER_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: user.telegram_id, text, parse_mode: 'HTML' })
        });
    } catch(e) {
        console.error("Order status Telegram notification error:", e);
    }
}

export async function sendTransferOTP(phone: string, amount: number, receiverPhone: string, code: string) {
    try {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('telegram_id')
            .eq('phone', phone)
            .single();

        if (!user || !user.telegram_id || !CUSTOMER_BOT_TOKEN) return;

        let text = `💳 <b>P2P O'tkazma so'rovi!</b>\n\n`;
        text += `💰 Summa: <b>${amount.toLocaleString()} so'm</b>\n`;
        text += `👤 Qabul qiluvchi: <b>${receiverPhone}</b>\n\n`;
        text += `🔑 Tasdiqlash kodi: <code>${code}</code>\n\n`;
        text += `⚠️ <i>Agar ushbu so'rovni siz yubormagan bo'lsangiz, kodni hech kimga bermang!</i>`;

        await fetch(`https://api.telegram.org/bot${CUSTOMER_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: user.telegram_id, text, parse_mode: 'HTML' })
        });
    } catch(e) {
        console.error("OTP Telegram notification error:", e);
    }
}

export async function sendCartReminder(phone: string, items: any[]) {
    try {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('telegram_id, name')
            .eq('phone', phone)
            .single();

        if (!user || !user.telegram_id || !CUSTOMER_BOT_TOKEN) return { success: false, error: "Foydalanuvchi botga ulanmagan" };

        const itemsText = items.map((i: any) => `- ${i.name} (x${i.quantity} ta)`).join('\n');
        const total = items.reduce((sum, i) => sum + (Number(i.price) * (i.quantity || 1)), 0);

        let text = `🛒 <b>Savatda mahsulotlar qolib ketdi!</b>\n\n`;
        text += `Assalomu alaykum, <b>${user.name || 'Mijoz'}</b>!\n`;
        text += `Sizning savatingizda quyidagi mahsulotlar o'z xaridini kutmoqda:\n\n`;
        text += `📦 <b>Siz tanlagan mahsulotlar:</b>\n${itemsText}\n\n`;
        text += `💰 <b>Jami summa:</b> ${total.toLocaleString()} so'm\n\n`;
        text += `🏃‍♂️ <i>Mahsulotlar soni cheklangan, ularni hoziroq xarid qiling! Saytimizga kirib buyurtmani yakunlashingiz mumkin.</i>`;

        const res = await fetch(`https://api.telegram.org/bot${CUSTOMER_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: user.telegram_id, text, parse_mode: 'HTML' })
        });
        
        const data = await res.json();
        if (!data.ok) throw new Error(data.description);

        return { success: true };
    } catch(e: any) {
        console.error("Cart reminder Telegram notification error:", e);
        return { success: false, error: e.message };
    }
}

export async function sendLowStockAlert(lowStockItems: { name: string; stock: number }[]) {
    try {
        if (!ADMIN_BOT_TOKEN || !ADMIN_ID || lowStockItems.length === 0) return;

        let text = `⚠️ <b>DIQQAT! Mahsulot tugamoqda</b>\n\n`;
        text += `Quyidagi mahsulotlarning ombordagi qoldig'i 5 tadan kam qoldi:\n\n`;
        
        lowStockItems.forEach((item, index) => {
            text += `${index + 1}. <b>${item.name}</b> — <i>${item.stock} ta qoldi!</i>\n`;
        });
        
        text += `\n<i>Sotuvlar to'xtab qolmasligi uchun zudlik bilan omborni to'ldiring.</i>`;

        await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ADMIN_ID, text, parse_mode: 'HTML' })
        });
    } catch(e) {
        console.error("Low stock Telegram alert error:", e);
    }
}
export async function sendPinResetCode(phone: string, code: string) {
    try {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('telegram_id')
            .eq('phone', phone)
            .single();

        if (!user || !user.telegram_id || !CUSTOMER_BOT_TOKEN) return;

        let text = `🔐 <b>Hamkorlik PIN-kodini tiklash!</b>\n\n`;
        text += `Tasdiqlash kodi: <code>${code}</code>\n\n`;
        text += `⚠️ <i>Ushbu kodni hech kimga bermang! Agar ushbu so'rovni siz yubormagan bo'lsangiz, ushbu xabarga e'tibor bermang.</i>`;

        await fetch(`https://api.telegram.org/bot${CUSTOMER_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: user.telegram_id, text, parse_mode: 'HTML' })
        });
    } catch(e) {
        console.error("PIN Reset Telegram notification error:", e);
    }
}
