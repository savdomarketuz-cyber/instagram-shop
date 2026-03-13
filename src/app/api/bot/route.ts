import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

import { hashPassword } from "@/lib/auth-utils";

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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!body.message) return NextResponse.json({ ok: true });

        const { chat, text, contact } = body.message;
        const chatId = chat.id;

        // Bot sessiyasini Firestore orqali boshqarish
        const sessionRef = doc(db, "bot_sessions", chatId.toString());
        const sessionSnap = await getDoc(sessionRef);
        const session = sessionSnap.exists() ? sessionSnap.data() : null;

        // 1. /start buyrug'i
        if (text === "/start") {
            await deleteDoc(sessionRef);
            await sendTelegramMessage(chatId, 
                "Assalomu alaykum! <b>Velari</b> do'konimizdan ro'yxatdan o'tish uchun quyidagi tugmani bosib telefon raqamingizni yuboring:",
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
            let phone = contact.phone_number;
            if (!phone.startsWith("+")) phone = "+" + phone;

            await setDoc(sessionRef, {
                phone,
                step: "password",
                updatedAt: serverTimestamp()
            });

            await sendTelegramMessage(chatId, "Yaxshi! Endi saytga kirish uchun yangi parol o'rnating (kamida 6 ta belgi):", {
                remove_keyboard: true
            });
            return NextResponse.json({ ok: true });
        }

        // 3. Qadamlar bo'yicha muloqot
        if (session) {
            if (session.step === "password") {
                if (text.length < 6) {
                    await sendTelegramMessage(chatId, "Parol juda qisqa. Kamida 6 ta belgidan iborat parol kiriting:");
                    return NextResponse.json({ ok: true });
                }

                await updateDoc(sessionRef, {
                    tempPasswordHash: hashPassword(text), // Hash qilingan vaqtinchalik parol
                    step: "confirm_password"
                });

                await sendTelegramMessage(chatId, "Parolni tasdiqlash uchun qayta kiriting:");
            } 
            else if (session.step === "confirm_password") {
                if (hashPassword(text) !== session.tempPasswordHash) {
                    await sendTelegramMessage(chatId, "Xatolik! Parollar mos kelmadi. Qaytadan parol kiriting:");
                    await updateDoc(sessionRef, { step: "password" });
                    return NextResponse.json({ ok: true });
                }

                // Foydalanuvchini asosiy bazaga saqlash
                await setDoc(doc(db, "users", session.phone), {
                    phone: session.phone,
                    password: hashPassword(text), // Hash qilingan parol
                    telegram_id: chatId,
                    createdAt: serverTimestamp()
                });

                await sendTelegramMessage(chatId, 
                    `Muvaffaqiyatli! ✅\n\nSiz ro'yxatdan o'tdingiz.\nTelefon: <code>${session.phone}</code>\nSaytga kirib ushbu raqam va parolingizdan foydalanishingiz mumkin.`
                );

                await deleteDoc(sessionRef);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Bot API Error:", error);
        return NextResponse.json({ ok: true }); // Telegram'ga doim ok qaytaramiz
    }
}
