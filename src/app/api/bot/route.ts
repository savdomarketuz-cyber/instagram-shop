import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/auth-utils";
import crypto from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://velari.uz";
const PROMO_CODE = "VELARI2026";

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            reply_markup: replyMarkup,
            parse_mode: "HTML"
        }),
    });
}

// Parol kabi maxfiy xabarlarni chatdan o'chirish (xavfsizlik uchun)
async function deleteTelegramMessage(chatId: number, messageId?: number | null) {
    if (!messageId) return;
    try {
        await fetch(`${TELEGRAM_API}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
        });
    } catch { /* o'chirib bo'lmasa jim qolamiz */ }
}

// /start <payload> dagi base64url manzilni xavfsiz dekod qilish
function decodeNextPath(payload?: string): string | null {
    if (!payload || payload === "register") return null;
    try {
        const dec = Buffer.from(payload, "base64url").toString("utf8");
        // Faqat ichki nisbiy manzil (ochiq redirect xavfini oldini olish)
        if (dec.startsWith("/") && !dec.startsWith("//")) return dec;
    } catch { /* noto'g'ri payload */ }
    return null;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!body.message) return NextResponse.json({ ok: true });

        const { chat, text, contact, message_id } = body.message;
        const chatId = chat.id;

        // Bot sessiyasini Supabase orqali boshqarish
        const { data: session } = await supabaseAdmin
            .from("bot_sessions")
            .select("*")
            .eq("chat_id", chatId.toString())
            .single();

        // 1. /start buyrug'i (with or without params)
        if (text?.startsWith("/start")) {
            const payload = text.split(" ")[1];
            const nextPath = decodeNextPath(payload);

            // Yangi sessiya — qaytish manzilini (next_path) saqlab qo'yamiz
            await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", chatId.toString());
            await supabaseAdmin.from("bot_sessions").insert({
                chat_id: chatId.toString(),
                step: "await_contact",
                next_path: nextPath,
                updated_at: new Date().toISOString(),
            });

            await sendTelegramMessage(chatId,
                "Assalomu alaykum! <b>Velari</b> do'konimizdan ro'yxatdan o'tish yoki parolni tiklash uchun quyidagi tugmani bosib telefon raqamingizni yuboring:",
                {
                    keyboard: [[{ text: "📱 Kontaktni yuborish", request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            );
            return NextResponse.json({ ok: true });
        }

        // 2. Kontakt kelganda
        if (contact) {
            // 🛡 SECURITY CHECK: Verify that the contact belongs to the sender
            if (contact.user_id !== chatId) {
                await sendTelegramMessage(chatId, "Xatolik! ❌ Iltimos, o'z raqamingizni '📱 Kontaktni yuborish' tugmasi orqali yuboring.");
                return NextResponse.json({ ok: true });
            }

            let phone = contact.phone_number;
            if (!phone.startsWith("+")) phone = "+" + phone;

            // next_path mavjud sessiyada saqlanib qoladi (upsert faqat berilgan ustunlarni yangilaydi)
            await supabaseAdmin.from("bot_sessions").upsert({
                chat_id: chatId.toString(),
                phone,
                step: "password",
                updated_at: new Date().toISOString()
            });

            await sendTelegramMessage(chatId, "Yaxshi! Endi saytga kirish uchun yangi parol o'rnating (kamida 6 ta belgi):", {
                remove_keyboard: true
            });
            return NextResponse.json({ ok: true });
        }

        // 3. Qadamlar bo'yicha muloqot
        if (session) {
            if (session.step === "password") {
                if (!text || text.length < 6) {
                    await sendTelegramMessage(chatId, "Parol juda qisqa. Kamida 6 ta belgidan iborat parol kiriting:");
                    return NextResponse.json({ ok: true });
                }

                // Birinchi parol xabarining ID sini saqlaymiz (keyin o'chirish uchun)
                await supabaseAdmin.from("bot_sessions").update({
                    temp_password_hash: hashPassword(text),
                    pwd_msg_id: message_id,
                    step: "confirm_password"
                }).eq("chat_id", chatId.toString());

                await sendTelegramMessage(chatId, "Parolni tasdiqlash uchun qayta kiriting:");
            }
            else if (session.step === "confirm_password") {
                if (!text || hashPassword(text) !== session.temp_password_hash) {
                    await sendTelegramMessage(chatId, "Xatolik! Parollar mos kelmadi. Qaytadan parol kiriting:");
                    await supabaseAdmin.from("bot_sessions").update({ step: "password", pwd_msg_id: null }).eq("chat_id", chatId.toString());
                    return NextResponse.json({ ok: true });
                }

                // Foydalanuvchini bazadan izlash / saqlash
                const { data: existingUser } = await supabaseAdmin.from("users").select("id").eq("phone", session.phone).single();
                await supabaseAdmin.from("users").upsert({
                    id: existingUser?.id || crypto.randomUUID(),
                    phone: session.phone,
                    password: hashPassword(text),
                    telegram_id: chatId.toString(),
                }, { onConflict: 'phone' });

                // 🔐 Xavfsizlik: yuborilgan parol xabarlarini chatdan o'chiramiz
                await deleteTelegramMessage(chatId, session.pwd_msg_id);   // 1-parol
                await deleteTelegramMessage(chatId, message_id);            // tasdiq paroli

                // 🎟 Bir martalik avtomatik kirish tokeni (30 daqiqa)
                const loginToken = crypto.randomBytes(24).toString("hex");
                await supabaseAdmin.from("login_tokens").insert({
                    token: loginToken,
                    phone: session.phone,
                    next_path: session.next_path || null,
                    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                });

                const returnUrl = `${SITE_URL}/uz/auth?lt=${loginToken}`;

                await sendTelegramMessage(chatId,
                    `✅ <b>Parolingiz tasdiqlandi!</b>\n\n` +
                    `Telefon: <code>${session.phone}</code>\n\n` +
                    `🎁 <b>Sovg'a:</b> sizga <code>${PROMO_CODE}</code> promokodi berildi — <b>30 000 so'm</b> chegirma.\n\n` +
                    `Quyidagi tugma orqali saytga <b>avtomatik kirgan holda</b> qayting:`,
                    {
                        inline_keyboard: [[{ text: "🌐 Saytga qaytish", url: returnUrl }]]
                    }
                );

                await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", chatId.toString());
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Bot API Error:", error);
        return NextResponse.json({ ok: true });
    }
}
