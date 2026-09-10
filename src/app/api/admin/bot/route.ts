import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSupportReplyToCustomer } from "@/lib/telegram";
import {
    sendTelegramRaw,
    answerCallback,
    editMessage,
    buildProductCard,
    sendProductForModeration,
    getNextProductToReview
} from "@/lib/telegram-moderation";

const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}`;

async function sendAdminMessage(chatId: number | string, text: string, replyMarkup?: any) {
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

        // ==========================================
        // 1. INLINE CALLBACK QUERY HANDLER
        // ==========================================
        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const messageId = cb.message.message_id;
            const data: string = cb.data || "";

            // A) 🗑 RASMNI O'CHIRISH (del_img:<productId>:<idx>)
            if (data.startsWith("del_img:")) {
                const [, productId, idxStr] = data.split(":");
                const imgIdx = parseInt(idxStr, 10);

                const { data: prod } = await supabaseAdmin
                    .from("products")
                    .select("*")
                    .eq("id", productId)
                    .single();

                if (!prod) {
                    await answerCallback(cb.id, "❌ Mahsulot topilmadi!", true);
                    return NextResponse.json({ ok: true });
                }

                const currentImages: string[] = prod.images && prod.images.length > 0 ? [...prod.images] : (prod.image ? [prod.image] : []);
                if (imgIdx < 0 || imgIdx >= currentImages.length) {
                    await answerCallback(cb.id, "❌ Bu rasm allaqachon o'chirilgan!", true);
                    return NextResponse.json({ ok: true });
                }

                const deletedUrl = currentImages[imgIdx];
                currentImages.splice(imgIdx, 1);

                const updatedMeta = { ...(prod.image_metadata || {}) };
                if (deletedUrl && updatedMeta[deletedUrl]) {
                    delete updatedMeta[deletedUrl];
                }

                const newMainImage = currentImages[0] || "";

                // Update in Supabase
                await supabaseAdmin
                    .from("products")
                    .update({
                        image: newMainImage,
                        images: currentImages,
                        image_metadata: updatedMeta,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", productId);

                await answerCallback(cb.id, `✅ ${imgIdx + 1}-rasm muvaffaqiyatli o'chirildi! Qoldi: ${currentImages.length} ta`);

                // Re-render updated card
                const { data: brands } = await supabaseAdmin.from("brands").select("id, name");
                const brandsMap: Record<string, string> = {};
                (brands || []).forEach(b => { brandsMap[String(b.id)] = b.name; });

                const updatedProd = { ...prod, image: newMainImage, images: currentImages, image_metadata: updatedMeta };
                const card = buildProductCard(updatedProd as any, brandsMap);

                await editMessage(chatId, messageId, card.text, card.reply_markup);
                return NextResponse.json({ ok: true });
            }

            // B) 💰 NARXNI O'ZGARTIRISH (edit_price:<productId>)
            if (data.startsWith("edit_price:")) {
                const [, productId] = data.split(":");
                await supabaseAdmin.from("bot_sessions").upsert({
                    chat_id: chatId.toString(),
                    step: `edit_price:${productId}`,
                    updated_at: new Date().toISOString()
                });

                await answerCallback(cb.id);
                await sendAdminMessage(
                    chatId,
                    `💰 <b>Yangi sotuv narxini kiriting:</b>\n\n` +
                    `<i>Faqat son kiriting (masalan: <code>250000</code>)\n` +
                    `Yoki sotuv va eski narxni birga kiriting: <code>250000 350000</code></i>`,
                    {
                        inline_keyboard: [
                            [{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]
                        ]
                    }
                );
                return NextResponse.json({ ok: true });
            }

            // C) 🔢 MODELNI O'ZGARTIRISH (edit_model:<productId>)
            if (data.startsWith("edit_model:")) {
                const [, productId] = data.split(":");
                await supabaseAdmin.from("bot_sessions").upsert({
                    chat_id: chatId.toString(),
                    step: `edit_model:${productId}`,
                    updated_at: new Date().toISOString()
                });

                await answerCallback(cb.id);
                await sendAdminMessage(
                    chatId,
                    `🔢 <b>Yangi model kodini kiriting:</b>\n\n<i>Masalan: <code>V-475</code> yoki <code>CR-8803</code></i>`,
                    {
                        inline_keyboard: [
                            [{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]
                        ]
                    }
                );
                return NextResponse.json({ ok: true });
            }

            // D) 📝 NOMNI O'ZGARTIRISH (edit_name:<productId>)
            if (data.startsWith("edit_name:")) {
                const [, productId] = data.split(":");
                await supabaseAdmin.from("bot_sessions").upsert({
                    chat_id: chatId.toString(),
                    step: `edit_name:${productId}`,
                    updated_at: new Date().toISOString()
                });

                await answerCallback(cb.id);
                await sendAdminMessage(
                    chatId,
                    `📝 <b>Yangi mahsulot nomini yuboring (O'zbekcha):</b>`,
                    {
                        inline_keyboard: [
                            [{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]
                        ]
                    }
                );
                return NextResponse.json({ ok: true });
            }

            // E) 🏷 BRENDNI TANLASH (edit_brand:<productId>)
            if (data.startsWith("edit_brand:")) {
                const [, productId] = data.split(":");
                await answerCallback(cb.id);

                const { data: topBrands } = await supabaseAdmin
                    .from("brands")
                    .select("id, name")
                    .eq("is_deleted", false)
                    .limit(10);

                const brandButtons: any[][] = [];
                (topBrands || []).forEach(b => {
                    brandButtons.push([{ text: `🏷 ${b.name}`, callback_data: `set_brand:${productId}:${b.id}` }]);
                });
                brandButtons.push([{ text: "✏️ Boshqa brend yozish", callback_data: `custom_brand:${productId}` }]);
                brandButtons.push([{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]);

                await sendAdminMessage(
                    chatId,
                    `🏷 <b>Mahsulot uchun brendni tanlang:</b>`,
                    { inline_keyboard: brandButtons }
                );
                return NextResponse.json({ ok: true });
            }

            // F) SET BRAND (set_brand:<productId>:<brandId>)
            if (data.startsWith("set_brand:")) {
                const [, productId, brandId] = data.split(":");
                await supabaseAdmin
                    .from("products")
                    .update({ brand_id: brandId, updated_at: new Date().toISOString() })
                    .eq("id", productId);

                await answerCallback(cb.id, "✅ Brend muvaffaqiyatli o'zgartirildi!");
                
                const { data: updatedProd } = await supabaseAdmin.from("products").select("*").eq("id", productId).single();
                if (updatedProd) {
                    await sendProductForModeration(chatId, updatedProd as any, false);
                }
                return NextResponse.json({ ok: true });
            }

            // G) CUSTOM BRAND INPUT
            if (data.startsWith("custom_brand:")) {
                const [, productId] = data.split(":");
                await supabaseAdmin.from("bot_sessions").upsert({
                    chat_id: chatId.toString(),
                    step: `edit_brand_custom:${productId}`,
                    updated_at: new Date().toISOString()
                });
                await answerCallback(cb.id);
                await sendAdminMessage(chatId, `✏️ <b>Yangi brend nomini yozib yuboring:</b>`, {
                    inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]]
                });
                return NextResponse.json({ ok: true });
            }

            // H) 🗑 MAHSULOTNI BUTUNLAY O'CHIRISH (del_prod:<productId>)
            if (data.startsWith("del_prod:")) {
                const [, productId] = data.split(":");
                await supabaseAdmin
                    .from("products")
                    .update({ is_deleted: true, updated_at: new Date().toISOString() })
                    .eq("id", productId);

                await answerCallback(cb.id, "🗑 Mahsulot o'chirildi!", true);
                await editMessage(chatId, messageId, `<s>Mahsulot muvaffaqiyatli o'chirildi 🗑</s>`);

                // Auto fetch next product
                const next = await getNextProductToReview(productId);
                if (next) {
                    await sendProductForModeration(chatId, next, true);
                } else {
                    await sendAdminMessage(chatId, "🎉 <b>Barcha mahsulotlar ko'rib chiqildi!</b>");
                }
                return NextResponse.json({ ok: true });
            }

            // I) ✅ KEYINGI MAHSULOT (next_prod:<currentId>)
            if (data.startsWith("next_prod:")) {
                const [, currentId] = data.split(":");
                await answerCallback(cb.id, "Keyingisi yuklanmoqda...");

                const next = await getNextProductToReview(currentId);
                if (next && next.id !== currentId) {
                    await sendProductForModeration(chatId, next, true);
                } else {
                    await sendAdminMessage(chatId, "🎉 <b>Barcha yangi mahsulotlar ko'rib chiqildi!</b>");
                }
                return NextResponse.json({ ok: true });
            }

            // J) ❌ BEKOR QILISH (cancel_action)
            if (data.startsWith("cancel_action")) {
                await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", chatId.toString());
                await answerCallback(cb.id, "Amal bekor qilindi");
                await sendAdminMessage(chatId, "❌ <i>Amal bekor qilindi.</i>");
                return NextResponse.json({ ok: true });
            }
        }

        // ==========================================
        // 2. INCOMING TEXT MESSAGE HANDLER
        // ==========================================
        if (body.message) {
            const { chat, text, reply_to_message } = body.message;
            const adminChatId = chat.id;
            if (!text) return NextResponse.json({ ok: true });

            const trimmed = text.trim();

            // Check active session step
            const { data: session } = await supabaseAdmin
                .from("bot_sessions")
                .select("*")
                .eq("chat_id", adminChatId.toString())
                .single();

            if (session && session.step) {
                // 1. NARX KIRITISH
                if (session.step.startsWith("edit_price:")) {
                    const productId = session.step.split(":")[1];
                    const nums = trimmed.replace(/[^0-9 ]/g, "").trim().split(/\s+/).map(Number).filter((n: number) => n > 0);

                    if (nums.length === 0) {
                        await sendAdminMessage(adminChatId, "❌ Noto'g'ri narx! Iltimos faqat son kiriting (masalan: <code>250000</code>):");
                        return NextResponse.json({ ok: true });
                    }

                    const newPrice = nums[0];
                    const newOldPrice = nums.length > 1 ? nums[1] : undefined;

                    const updateData: any = { price: newPrice, updated_at: new Date().toISOString() };
                    if (newOldPrice !== undefined) updateData.old_price = newOldPrice;

                    await supabaseAdmin.from("products").update(updateData).eq("id", productId);
                    await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", adminChatId.toString());

                    await sendAdminMessage(
                        adminChatId,
                        `✅ <b>Narx muvaffaqiyatli yangilandi!</b>\n` +
                        `💰 Sotuv narxi: <b>${newPrice.toLocaleString()} so'm</b>` +
                        (newOldPrice ? `\n<s>Eski narx: ${newOldPrice.toLocaleString()} so'm</s>` : "")
                    );

                    const { data: updatedProd } = await supabaseAdmin.from("products").select("*").eq("id", productId).single();
                    if (updatedProd) {
                        await sendProductForModeration(adminChatId, updatedProd as any, false);
                    }
                    return NextResponse.json({ ok: true });
                }

                // 2. MODEL KIRITISH
                if (session.step.startsWith("edit_model:")) {
                    const productId = session.step.split(":")[1];
                    const newModel = trimmed;

                    await supabaseAdmin.from("products").update({
                        model: newModel,
                        updated_at: new Date().toISOString()
                    }).eq("id", productId);

                    await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", adminChatId.toString());
                    await sendAdminMessage(adminChatId, `✅ <b>Model yangilandi:</b> <code>${newModel}</code>`);

                    const { data: updatedProd } = await supabaseAdmin.from("products").select("*").eq("id", productId).single();
                    if (updatedProd) {
                        await sendProductForModeration(adminChatId, updatedProd as any, false);
                    }
                    return NextResponse.json({ ok: true });
                }

                // 3. NOM KIRITISH
                if (session.step.startsWith("edit_name:")) {
                    const productId = session.step.split(":")[1];
                    const newName = trimmed;

                    await supabaseAdmin.from("products").update({
                        name: newName,
                        name_uz: newName,
                        updated_at: new Date().toISOString()
                    }).eq("id", productId);

                    await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", adminChatId.toString());
                    await sendAdminMessage(adminChatId, `✅ <b>Nom yangilandi:</b>\n${newName}`);

                    const { data: updatedProd } = await supabaseAdmin.from("products").select("*").eq("id", productId).single();
                    if (updatedProd) {
                        await sendProductForModeration(adminChatId, updatedProd as any, false);
                    }
                    return NextResponse.json({ ok: true });
                }

                // 4. CUSTOM BRAND KIRITISH
                if (session.step.startsWith("edit_brand_custom:")) {
                    const productId = session.step.split(":")[1];
                    const brandName = trimmed;

                    let { data: bRow } = await supabaseAdmin.from("brands").select("id").ilike("name", brandName).single();
                    if (!bRow) {
                        const { data: newB } = await supabaseAdmin.from("brands").insert({ name: brandName, is_deleted: false }).select("id").single();
                        bRow = newB;
                    }

                    if (bRow) {
                        await supabaseAdmin.from("products").update({
                            brand_id: bRow.id,
                            updated_at: new Date().toISOString()
                        }).eq("id", productId);
                    }

                    await supabaseAdmin.from("bot_sessions").delete().eq("chat_id", adminChatId.toString());
                    await sendAdminMessage(adminChatId, `✅ <b>Brend yangilandi:</b> 🏷 ${brandName}`);

                    const { data: updatedProd } = await supabaseAdmin.from("products").select("*").eq("id", productId).single();
                    if (updatedProd) {
                        await sendProductForModeration(adminChatId, updatedProd as any, false);
                    }
                    return NextResponse.json({ ok: true });
                }
            }

            // COMMANDS: /start, /review, /moderatsiya, /next
            if (trimmed === "/start" || trimmed === "/review" || trimmed === "/moderatsiya") {
                await sendAdminMessage(
                    adminChatId,
                    `👋 <b>Velari Mahsulotlar Moderatsiya Boti</b>\n\n` +
                    `🔍 Yangi qo'shilgan mahsulotlarni ko'rib chiqish boshlanmoqda...`
                );
                const first = await getNextProductToReview();
                if (first) {
                    await sendProductForModeration(adminChatId, first, true);
                } else {
                    await sendAdminMessage(adminChatId, "Bazada yangi ko'rib chiqilmagan mahsulotlar yo'q.");
                }
                return NextResponse.json({ ok: true });
            }

            if (trimmed === "/next") {
                const next = await getNextProductToReview();
                if (next) {
                    await sendProductForModeration(adminChatId, next, true);
                }
                return NextResponse.json({ ok: true });
            }

            // CUSTOMER SUPPORT REPLY SUPPORT: /reply <chat_id> <text>
            let targetCustomerChatId: string | null = null;
            let replyText = "";

            if (trimmed.startsWith("/reply ")) {
                const parts = trimmed.slice(7).trim().split(" ");
                if (parts.length >= 2) {
                    targetCustomerChatId = parts[0];
                    replyText = parts.slice(1).join(" ");
                }
            } else if (reply_to_message && reply_to_message.text) {
                const match = reply_to_message.text.match(/Telegram ID:\s*(\d+)/i);
                if (match && match[1]) {
                    targetCustomerChatId = match[1];
                    replyText = trimmed;
                }
            }

            if (targetCustomerChatId && replyText) {
                const success = await sendSupportReplyToCustomer(targetCustomerChatId, replyText);
                if (success) {
                    await sendAdminMessage(adminChatId, `✅ <b>Javob mijozga yuborildi!</b>\n\n🆔 Chat ID: <code>${targetCustomerChatId}</code>`);
                } else {
                    await sendAdminMessage(adminChatId, `❌ <b>Xatolik!</b> Javobni mijozga yuborib bo'lmadi.`);
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Admin Bot Route Error:", error);
        return NextResponse.json({ ok: true });
    }
}
