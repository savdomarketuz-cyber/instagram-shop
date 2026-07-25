import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/auth-utils";
import crypto from "crypto";
import { getUserOrdersForBot, forwardCustomerSupportMessage } from "@/lib/telegram";

const BOT_TOKEN = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN || "8679198732:AAFnTD1-pKA-UYTaG_Hnapd2NIjICPMNMOE";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://velari.uz";
const PROMO_CODE = "VELARI2026";

// Bosh menyu (Reply Keyboard)
const MAIN_KEYBOARD = {
    keyboard: [
        [{ text: "📱 Ro'yxatdan o'tish / Saytga kirish" }, { text: "🛍 Mening buyurtmalarim" }],
        [{ text: "💬 Operatorga yozish" }, { text: "❓ Savol-javob (FAQ)" }]
    ],
    resize_keyboard: true
};

// Jarayonlarni bekor qilish tugmasi
const CANCEL_KEYBOARD = {
    keyboard: [
        [{ text: "❌ Bekor qilish / Orqaga" }]
    ],
    resize_keyboard: true
};

// FAQ Inline Keyboard
const FAQ_INLINE_KEYBOARD = {
    inline_keyboard: [
        [{ text: "🚚 Yetkazib berish", callback_data: "faq_delivery" }, { text: "💳 To'lov usullari", callback_data: "faq_payment" }],
        [{ text: "🔄 Kafolat va qaytarish", callback_data: "faq_return" }, { text: "🎁 Promokod", callback_data: "faq_promo" }],
        [{ text: "💬 Operatorga yozish", callback_data: "start_support" }]
    ]
};

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            reply_markup: replyMarkup !== undefined ? replyMarkup : MAIN_KEYBOARD,
            parse_mode: "HTML"
        }),
    });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text || ""
        }),
    });
}

async function animateAndDeletePasswordMessage(chatId: number | string, messageId?: number | null) {
    if (!messageId) return;
    try {
        // 1. Matnni xavfsiz holatga o'zgartirib animatsion visual effekt berish
        await fetch(`${TELEGRAM_API}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: "🔒 <i>Parol shifrlanmoqda va xavfsiz o'chirilmoqda... ✨</i>",
                parse_mode: "HTML"
            }),
        });

        // 2. Kichik taymer (efektni ko'rish uchun)
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 3. Telegram chatidan to'liq o'chirish
        await fetch(`${TELEGRAM_API}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
        });
    } catch { /* ignore error */ }
}


function decodeNextPath(payload?: string): string | null {
    if (!payload || payload === "register") return null;
    try {
        const dec = Buffer.from(payload, "base64url").toString("utf8");
        if (dec.startsWith("/") && !dec.startsWith("//")) return dec;
    } catch { /* invalid payload */ }
    return null;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Callback Query handling (Inline tugmalar uchun)
        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const data = cb.data;

            await answerCallbackQuery(cb.id);

            if (data === "faq_delivery") {
                await sendTelegramMessage(chatId,
                    "🚚 <b>Yetkazib berish shartlari:</b>\n\n" +
                    "• <b>Toshkent shahri:</b> 1 kunda (standart yoki kuryerlik orqali)\n" +
                    "• <b>Viloyatlar bo'yicha:</b> Pochta yoki kuryerlik xizmati orqali 1-3 ish kunida yetkaziladi.\n\n" +
                    "<i>Yetkazib berish narxi va vaqti rasmiylashtirishda ko'rsatiladi.</i>",
                    FAQ_INLINE_KEYBOARD
                );
            } else if (data === "faq_payment") {
                await sendTelegramMessage(chatId,
                    "💳 <b>To'lov usullari:</b>\n\n" +
                    "• <b>Click / Payme:</b> Onlayn to'lov qilish imkoniyati.\n" +
                    "• <b>Naqd to'lov:</b> Mahsulot eshigingizga yetib borganda tekshirib olingandan so'ng to'lanadi.",
                    FAQ_INLINE_KEYBOARD
                );
            } else if (data === "faq_return") {
                await sendTelegramMessage(chatId,
                    "🔄 <b>Kafolat va qaytarish:</b>\n\n" +
                    "• Barcha mahsulotlarimizga rasmiy kafolat beriladi.\n" +
                    "• Nuqsonli yoki noto'g'ri kelgan mahsulotlar 14 kun ichida bepul almashtiriladi yoki pulingiz qaytariladi.",
                    FAQ_INLINE_KEYBOARD
                );
            } else if (data === "faq_promo") {
                await sendTelegramMessage(chatId,
                    `🎁 <b>Promokodlar va Chegirmalar:</b>\n\n` +
                    `Velari do'konidan xarid qilish uchun <code>${PROMO_CODE}</code> promokodidan foydalanib <b>30 000 so'm</b> chegirmaga ega bo'ling!`,
                    FAQ_INLINE_KEYBOARD
                );
            } else if (data === "start_support") {
                await supabaseAdmin.from("bot_sessions").upsert({
                    chat_id: chatId.toString(),
                    step: "support_chat",
                    updated_at: new Date().toISOString()
                });
                await sendTelegramMessage(chatId,
                    "✍️ <b>Operatorga murojaat qilish:</b>\n\n" +
                    "Savolingiz yoki murojaatingizni yozib yuboring. Operatorlarimiz tez orada sizga javob qaytarishadi.",
                    CANCEL_KEYBOARD
                );
            }
            return NextResponse.json({ ok: true });
        }

        if (!body.message) return NextResponse.json({ ok: true });

        const { chat, text, contact, message_id } = body.message;
        const chatId = chat.id;

        // 2. Bekor qilish / Orqaga tugmasi bosilganda
        if (text === "❌ Bekor qilish / Orqaga" || text === "/cancel") {
            await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", chatId.toString());
            await sendTelegramMessage(chatId,
                "❌ Jarayon bekor qilindi. Bosh menyuga qaytildi:",
                MAIN_KEYBOARD
            );
            return NextResponse.json({ ok: true });
        }

        // Bot sessiyasini Supabase orqali olish
        const { data: session } = await supabaseAdmin
            .from("bot_sessions")
            .select("*")
            .eq("chat_id", chatId.toString())
            .single();

        // 3. /start buyrug'i
        if (text?.startsWith("/start")) {
            const payload = text.split(" ")[1];
            const nextPath = decodeNextPath(payload);

            await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", chatId.toString());

            await sendTelegramMessage(chatId,
                `Assalomu alaykum, <b>${chat.first_name || 'Mijoz'}</b>!\n\n` +
                `<b>Velari</b> rasmiy yordamchi botiga xush kelibsiz! ✨\n\n` +
                `Quyidagi menyu orqali ro'yxatdan o'tishingiz, buyurtmalaringiz holatini ko'rishingiz yoki operatorimiz bilan bog'lanishingiz mumkin:`,
                MAIN_KEYBOARD
            );
            return NextResponse.json({ ok: true });
        }

        // 4. Menyu tugmalari
        if (text === "📱 Ro'yxatdan o'tish / Saytga kirish" || text === "📱 Ro'yxatdan o'tish") {
            await supabaseAdmin.from("bot_sessions").upsert({
                chat_id: chatId.toString(),
                step: "await_contact",
                updated_at: new Date().toISOString(),
            });

            await sendTelegramMessage(chatId,
                "Ro'yxatdan o'tish yoki parolni tiklash uchun quyidagi tugmani bosib telefon raqamingizni yuboring:",
                {
                    keyboard: [
                        [{ text: "📱 Kontaktni yuborish", request_contact: true }],
                        [{ text: "❌ Bekor qilish / Orqaga" }]
                    ],
                    resize_keyboard: true
                }
            );
            return NextResponse.json({ ok: true });
        }

        if (text === "🛍 Mening buyurtmalarim") {
            const ordersInfo = await getUserOrdersForBot(chatId.toString());
            await sendTelegramMessage(chatId, ordersInfo.text, MAIN_KEYBOARD);
            return NextResponse.json({ ok: true });
        }

        if (text === "❓ Savol-javob (FAQ)") {
            await sendTelegramMessage(chatId,
                "❓ <b>Ko'p beriladigan savollar:</b>\n\nQuyidagi bo'limlardan birini tanlang:",
                FAQ_INLINE_KEYBOARD
            );
            return NextResponse.json({ ok: true });
        }

        if (text === "💬 Operatorga yozish") {
            await supabaseAdmin.from("bot_sessions").upsert({
                chat_id: chatId.toString(),
                step: "support_chat",
                updated_at: new Date().toISOString()
            });

            await sendTelegramMessage(chatId,
                "✍️ <b>Operatorga murojaat qilish:</b>\n\nSavolingiz yoki murojaatingizni shu yerga yozib yuboring. Operatorlarimiz tez orada javob berishadi.\n\n<i>(Chiqish uchun '❌ Bekor qilish / Orqaga' tugmasini bosing)</i>",
                CANCEL_KEYBOARD
            );
            return NextResponse.json({ ok: true });
        }

        // 5. Kontakt yuborilganda (Ro'yxatdan o'tish bosqichi)
        if (contact) {
            if (contact.user_id !== chatId) {
                await sendTelegramMessage(chatId, "Xatolik! ❌ Iltimos, o'z raqamingizni '📱 Kontaktni yuborish' tugmasi orqali yuboring.");
                return NextResponse.json({ ok: true });
            }

            let phone = contact.phone_number;
            if (!phone.startsWith("+")) phone = "+" + phone;

            await supabaseAdmin.from("bot_sessions").upsert({
                chat_id: chatId.toString(),
                phone,
                step: "password",
                updated_at: new Date().toISOString()
            });

            await sendTelegramMessage(chatId, "Yaxshi! Endi saytga kirish uchun yangi parol o'rnating (kamida 6 ta belgi):", CANCEL_KEYBOARD);
            return NextResponse.json({ ok: true });
        }

        // 6. Parol va Tasdiqlash bosqichlari
        if (session) {
            if (session.step === "password") {
                if (!text || text.length < 6) {
                    await sendTelegramMessage(chatId, "Parol juda qisqa. Kamida 6 ta belgidan iborat parol kiriting:", CANCEL_KEYBOARD);
                    return NextResponse.json({ ok: true });
                }

                await supabaseAdmin.from("bot_sessions").update({
                    temp_password_hash: hashPassword(text),
                    pwd_msg_id: message_id,
                    step: "confirm_password"
                }).eq("chat_id", chatId.toString());

                await sendTelegramMessage(chatId, "Parolni tasdiqlash uchun qayta kiriting:", CANCEL_KEYBOARD);
                return NextResponse.json({ ok: true });
            }

            if (session.step === "confirm_password") {
                if (!text || hashPassword(text) !== session.temp_password_hash) {
                    await sendTelegramMessage(chatId, "Xatolik! Parollar mos kelmadi. Qaytadan parol kiriting:", CANCEL_KEYBOARD);
                    await supabaseAdmin.from("bot_sessions").update({ step: "password", pwd_msg_id: null }).eq("chat_id", chatId.toString());
                    return NextResponse.json({ ok: true });
                }

                const { data: existingUser } = await supabaseAdmin.from("users").select("id").eq("phone", session.phone).single();
                await supabaseAdmin.from("users").upsert({
                    id: existingUser?.id || crypto.randomUUID(),
                    phone: session.phone,
                    password: hashPassword(text),
                    telegram_id: chatId.toString(),
                }, { onConflict: 'phone' });

                await animateAndDeletePasswordMessage(chatId, session.pwd_msg_id);
                await animateAndDeletePasswordMessage(chatId, message_id);

                const loginToken = crypto.randomBytes(24).toString("hex");
                await supabaseAdmin.from("login_tokens").insert({
                    token: loginToken,
                    phone: session.phone,
                    next_path: session.next_path || null,
                    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                });

                const returnUrl = `${SITE_URL}/uz/auth?lt=${loginToken}`;

                await sendTelegramMessage(chatId,
                    `✅ <b>Parolingiz muvaffaqiyatli saqlandi!</b>\n\n` +
                    `Telefon: <code>${session.phone}</code>\n\n` +
                    `🎁 <b>Sovg'a:</b> sizga <code>${PROMO_CODE}</code> promokodi berildi — <b>30 000 so'm</b> chegirma.\n\n` +
                    `Quyidagi tugma orqali saytga <b>avtomatik kirgan holda</b> o'tishingiz mumkin:`,
                    {
                        inline_keyboard: [[{ text: "🌐 Saytga kirish", url: returnUrl }]]
                    }
                );

                await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", chatId.toString());
                return NextResponse.json({ ok: true });
            }
        }

        // 7. Odatiy matnli xabarlar (Support/Operatorga uzatish)
        if (text) {
            const { data: user } = await supabaseAdmin.from("users").select("phone, name").eq("telegram_id", chatId.toString()).single();

            const sent = await forwardCustomerSupportMessage(
                chatId.toString(),
                user?.phone || session?.phone || null,
                user?.name || chat.first_name || null,
                text
            );

            if (sent) {
                await sendTelegramMessage(chatId,
                    "📩 <b>Xabaringiz operatorga yetkazildi!</b>\n\nTez orada operatorimiz sizga ushbu bot orqali javob beradi.",
                    CANCEL_KEYBOARD
                );
            } else {
                await sendTelegramMessage(chatId,
                    "Tizimda kichik xatolik yuz berdi. Iltimos, qaytadan yozib ko'ring yoki birozdan so'ng urinib ko'ring.",
                    MAIN_KEYBOARD
                );
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Bot API Error:", error);
        return NextResponse.json({ ok: true });
    }
}
