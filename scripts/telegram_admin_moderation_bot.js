const path = require('path');
const crypto = require('crypto');
const projectDir = path.resolve(__dirname, '..');
const { createClient } = require(path.join(projectDir, 'node_modules/@supabase/supabase-js'));
require(path.join(projectDir, 'node_modules/dotenv')).config({ path: path.join(projectDir, '.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Local in-memory session states (fast & reliable for polling)
const sessions = new Map(); // chatId -> { step, productId, temp }

async function callTelegram(method, payload = {}) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

function buildProductCard(prod, brandsMap) {
  const name = prod.name_uz || prod.name;
  const bId = String(prod.brand_id || prod.brand || "");
  let brand = brandsMap[bId];
  if (!brand) {
    const skuUpper = (prod.sku || "").toUpperCase();
    if (skuUpper.startsWith("VGR")) brand = "VGR";
    else if (skuUpper.startsWith("CRONIER")) brand = "CRONIER";
    else if (skuUpper.startsWith("MAC")) brand = "M•A•C STYLER";
    else if (skuUpper.startsWith("JRM")) brand = "J•R•M STYLER";
    else if (skuUpper.startsWith("BABYVERSE")) brand = "BaByverse";
    else brand = "Ko'rsatilmagan";
  }

  const model = prod.model || "Noma'lum";
  const color = prod.color_name || "Ko'rsatilmagan";
  const sku = prod.sku || prod.article || prod.id;
  const barcode = prod.barcode || "Mavjud emas";
  const price = Number(prod.price || 0);
  const oldPrice = Number(prod.old_price || 0);
  const costPrice = Number(prod.cost_price || 0);
  const stock = Number(prod.stock || 0);
  const images = prod.images && prod.images.length > 0 ? prod.images : (prod.image ? [prod.image] : []);

  const lines = [
    `📦 <b>Mahsulot:</b> ${name}`,
    `🏷 <b>Brend:</b> ${brand}`,
    `🔢 <b>Model:</b> <code>${model}</code>`,
    `🎨 <b>Rang:</b> ${color}`,
    `🔖 <b>SKU:</b> <code>${sku}</code>`,
    `📊 <b>Bar-kod:</b> <code>${barcode}</code>`,
    ``,
    `💵 <b>Tan narxi:</b> ${costPrice > 0 ? `<b>${costPrice.toLocaleString()} so'm</b>` : `<i>⚠️ Kiritilmagan (0 so'm)</i>`}`,
    `💰 <b>Sotuv narxi:</b> <b>${price.toLocaleString()} so'm</b>`
  ];

  if (costPrice > 0 && price > costPrice) {
    const profit = price - costPrice;
    const margin = Math.round((profit / costPrice) * 100);
    lines.push(`📈 <b>Kutilayotgan sof foyda:</b> <b>+${profit.toLocaleString()} so'm</b> (+${margin}%)`);
  }

  if (oldPrice && oldPrice > price) {
    const disc = Math.round(((oldPrice - price) / oldPrice) * 100);
    lines.push(`<s>Eski narxi: ${oldPrice.toLocaleString()} so'm</s> (-${disc}%)`);
  }

  lines.push(`📦 <b>Omborda:</b> ${stock} ta`);
  lines.push(`🖼 <b>Rasmlar soni:</b> ${images.length} ta`);
  lines.push(`🆔 <b>ID:</b> <code>${prod.id}</code>`);

  // Build Inline Keyboard
  const inline_keyboard = [];

  // 1. Delete individual image buttons
  if (images.length > 0) {
    const imgButtons = [];
    images.forEach((_, idx) => {
      imgButtons.push({
        text: `🗑 ${idx + 1}-rasm`,
        callback_data: `del_img:${prod.id}:${idx}`
      });
    });

    for (let i = 0; i < imgButtons.length; i += 3) {
      inline_keyboard.push(imgButtons.slice(i, i + 3));
    }
  }

  // 2. Price & Cost Edits
  inline_keyboard.push([
    { text: "💵 Tan narxni kiritish", callback_data: `edit_cost:${prod.id}` },
    { text: "💰 Sotuv narxini o'zgartirish", callback_data: `edit_price:${prod.id}` }
  ]);

  // 3. Name & Model Edits
  inline_keyboard.push([
    { text: "🔢 Modelni tahrirlash", callback_data: `edit_model:${prod.id}` },
    { text: "📝 Nomni tahrirlash", callback_data: `edit_name:${prod.id}` }
  ]);

  // 4. Brand & Delete
  inline_keyboard.push([
    { text: "🏷 Brendni tanlash", callback_data: `edit_brand:${prod.id}` },
    { text: "🗑 Mahsulotni o'chirish", callback_data: `del_prod:${prod.id}` }
  ]);

  // 5. Navigation
  inline_keyboard.push([
    { text: "⬅️ Oldingisi", callback_data: `prev_prod:${prod.id}` },
    { text: "✅ Keyingisi ➡️", callback_data: `next_prod:${prod.id}` }
  ]);

  return {
    text: lines.join('\n'),
    reply_markup: { inline_keyboard }
  };
}

async function sendProductForModeration(chatId, prod, sendAlbum = true) {
  const { data: brands } = await supabase.from("brands").select("id, name");
  const brandsMap = {};
  (brands || []).forEach(b => { brandsMap[String(b.id)] = b.name; });

  const card = buildProductCard(prod, brandsMap);
  const meta = prod.image_metadata || {};
  const images = prod.images && prod.images.length > 0 ? prod.images : (prod.image ? [prod.image] : []);

  const photoUrls = images.map(u => meta[u]?.lg || u).filter(Boolean).slice(0, 10);

  if (sendAlbum && photoUrls.length > 0) {
    if (photoUrls.length === 1) {
      await callTelegram("sendPhoto", {
        chat_id: chatId,
        photo: photoUrls[0]
      });
    } else {
      const media = photoUrls.map(url => ({
        type: "photo",
        media: url
      }));
      await callTelegram("sendMediaGroup", {
        chat_id: chatId,
        media
      });
    }
  }

  return callTelegram("sendMessage", {
    chat_id: chatId,
    text: card.text,
    reply_markup: card.reply_markup,
    parse_mode: "HTML"
  });
}

async function getProductByOffset(currentId, direction = 1) {
  const { data: list } = await supabase
    .from("products")
    .select("*")
    .ilike("barcode", "478%")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(468);

  if (!list || list.length === 0) return null;
  if (!currentId) return list[0];

  const currIdx = list.findIndex(p => p.id === currentId);
  if (currIdx !== -1) {
    const nextIdx = currIdx + direction;
    if (nextIdx >= 0 && nextIdx < list.length) {
      return list[nextIdx];
    }
  }
  return list[0];
}

async function handleUpdate(update) {
  // 1. CALLBACK QUERY (Buttons)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message.chat.id;
    const messageId = cb.message.message_id;
    const data = cb.data || "";

    await callTelegram("answerCallbackQuery", { callback_query_id: cb.id });

    // A) 🗑 RASMNI O'CHIRISH (del_img:<productId>:<idx>)
    if (data.startsWith("del_img:")) {
      const [, productId, idxStr] = data.split(":");
      const imgIdx = parseInt(idxStr, 10);

      const { data: prod } = await supabase.from("products").select("*").eq("id", productId).single();
      if (!prod) return;

      const currentImages = prod.images && prod.images.length > 0 ? [...prod.images] : (prod.image ? [prod.image] : []);
      if (imgIdx >= 0 && imgIdx < currentImages.length) {
        const deletedUrl = currentImages[imgIdx];
        currentImages.splice(imgIdx, 1);

        const updatedMeta = { ...(prod.image_metadata || {}) };
        if (deletedUrl && updatedMeta[deletedUrl]) {
          delete updatedMeta[deletedUrl];
        }

        const newMainImage = currentImages[0] || "";
        await supabase
          .from("products")
          .update({
            image: newMainImage,
            images: currentImages,
            image_metadata: updatedMeta,
            updated_at: new Date().toISOString()
          })
          .eq("id", productId);

        const { data: brands } = await supabase.from("brands").select("id, name");
        const brandsMap = {};
        (brands || []).forEach(b => { brandsMap[String(b.id)] = b.name; });

        const updatedProd = { ...prod, image: newMainImage, images: currentImages, image_metadata: updatedMeta };
        const card = buildProductCard(updatedProd, brandsMap);

        await callTelegram("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: card.text,
          reply_markup: card.reply_markup,
          parse_mode: "HTML"
        });

        await callTelegram("sendMessage", {
          chat_id: chatId,
          text: `🗑 <b>${imgIdx + 1}-rasm o'chirildi!</b> Qolgan rasmlar: <b>${currentImages.length} ta</b>`,
          parse_mode: "HTML"
        });
      }
      return;
    }

    // B) 💵 TAN NARXNI KIRITISH (edit_cost:<productId>)
    if (data.startsWith("edit_cost:")) {
      const [, productId] = data.split(":");
      sessions.set(chatId.toString(), { step: `edit_cost:${productId}` });

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `💵 <b>Yangi TAN NARXINI kiriting (so'mda):</b>\n\n<i>Faqat son kiriting, masalan: <code>150000</code></i>`,
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]]
        },
        parse_mode: "HTML"
      });
      return;
    }

    // C) 💰 SOTUV NARXINI O'ZGARTIRISH (edit_price:<productId>)
    if (data.startsWith("edit_price:")) {
      const [, productId] = data.split(":");
      sessions.set(chatId.toString(), { step: `edit_price:${productId}` });

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `💰 <b>Yangi SOTUV NARXINI kiriting:</b>\n\n` +
          `<i>Masalan: <code>250000</code>\n` +
          `Yoki sotuv va eski narxni birga kiriting: <code>250000 350000</code></i>`,
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]]
        },
        parse_mode: "HTML"
      });
      return;
    }

    // D) 🔢 MODELNI TAHRIRLASH (edit_model:<productId>)
    if (data.startsWith("edit_model:")) {
      const [, productId] = data.split(":");
      sessions.set(chatId.toString(), { step: `edit_model:${productId}` });

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `🔢 <b>Yangi MODEL kodini kiriting:</b>\n\n<i>Masalan: <code>V-475</code> yoki <code>CR-8803</code></i>`,
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]]
        },
        parse_mode: "HTML"
      });
      return;
    }

    // E) 📝 NOMNI TAHRIRLASH (edit_name:<productId>)
    if (data.startsWith("edit_name:")) {
      const [, productId] = data.split(":");
      sessions.set(chatId.toString(), { step: `edit_name:${productId}` });

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `📝 <b>Yangi mahsulot nomini yuboring (O'zbekcha):</b>`,
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]]
        },
        parse_mode: "HTML"
      });
      return;
    }

    // F) 🏷 BRENDNI TANLASH (edit_brand:<productId>)
    if (data.startsWith("edit_brand:")) {
      const [, productId] = data.split(":");
      const { data: topBrands } = await supabase.from("brands").select("id, name").eq("is_deleted", false).limit(10);

      const brandButtons = [];
      (topBrands || []).forEach(b => {
        brandButtons.push([{ text: `🏷 ${b.name}`, callback_data: `set_brand:${productId}:${b.id}` }]);
      });
      brandButtons.push([{ text: "✏️ Boshqa brend yozish", callback_data: `custom_brand:${productId}` }]);
      brandButtons.push([{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]);

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `🏷 <b>Mahsulot brendini tanlang:</b>`,
        reply_markup: { inline_keyboard: brandButtons },
        parse_mode: "HTML"
      });
      return;
    }

    // G) SET BRAND
    if (data.startsWith("set_brand:")) {
      const [, productId, brandId] = data.split(":");
      await supabase.from("products").update({ brand_id: brandId, updated_at: new Date().toISOString() }).eq("id", productId);
      const { data: updatedProd } = await supabase.from("products").select("*").eq("id", productId).single();
      if (updatedProd) {
        await sendProductForModeration(chatId, updatedProd, false);
      }
      return;
    }

    // H) CUSTOM BRAND INPUT
    if (data.startsWith("custom_brand:")) {
      const [, productId] = data.split(":");
      sessions.set(chatId.toString(), { step: `edit_brand_custom:${productId}` });
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✏️ <b>Yangi brend nomini yozib yuboring:</b>`,
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_action:${productId}` }]]
        },
        parse_mode: "HTML"
      });
      return;
    }

    // I) 🗑 MAHSULOTNI BUTUNLAY O'CHIRISH (del_prod:<productId>)
    if (data.startsWith("del_prod:")) {
      const [, productId] = data.split(":");
      await supabase.from("products").update({ is_deleted: true, updated_at: new Date().toISOString() }).eq("id", productId);
      await callTelegram("sendMessage", { chat_id: chatId, text: `🗑 <b>Mahsulot bazadan o'chirildi!</b>`, parse_mode: "HTML" });

      const next = await getProductByOffset(productId, 1);
      if (next) {
        await sendProductForModeration(chatId, next, true);
      } else {
        await callTelegram("sendMessage", { chat_id: chatId, text: "🎉 <b>Barcha mahsulotlar ko'rib chiqildi!</b>", parse_mode: "HTML" });
      }
      return;
    }

    // J) ⬅️ OLDINGI / ➡️ KEYINGI MAHSULOT
    if (data.startsWith("next_prod:") || data.startsWith("prev_prod:")) {
      const isNext = data.startsWith("next_prod:");
      const [, currentId] = data.split(":");
      const next = await getProductByOffset(currentId, isNext ? 1 : -1);
      if (next) {
        await sendProductForModeration(chatId, next, true);
      } else {
        await callTelegram("sendMessage", { chat_id: chatId, text: "🎉 <b>Barcha mahsulotlar ko'rib chiqildi!</b>", parse_mode: "HTML" });
      }
      return;
    }

    // K) ❌ CANCEL
    if (data.startsWith("cancel_action")) {
      sessions.delete(chatId.toString());
      await callTelegram("sendMessage", { chat_id: chatId, text: "❌ <i>Amal bekor qilindi.</i>", parse_mode: "HTML" });
      return;
    }
  }

  // 2. TEXT MESSAGES
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const session = sessions.get(chatId.toString());

    // Active prompts
    if (session && session.step) {
      // TAN NARX
      if (session.step.startsWith("edit_cost:")) {
        const productId = session.step.split(":")[1];
        const num = Number(text.replace(/[^0-9]/g, ""));
        if (!num || num <= 0) {
          await callTelegram("sendMessage", { chat_id: chatId, text: "❌ Noto'g'ri son! Qaytadan kiriting:" });
          return;
        }

        await supabase.from("products").update({ cost_price: num, updated_at: new Date().toISOString() }).eq("id", productId);
        sessions.delete(chatId.toString());

        await callTelegram("sendMessage", {
          chat_id: chatId,
          text: `✅ <b>Tan narxi saqlandi:</b> <b>${num.toLocaleString()} so'm</b>`,
          parse_mode: "HTML"
        });

        const { data: updatedProd } = await supabase.from("products").select("*").eq("id", productId).single();
        if (updatedProd) await sendProductForModeration(chatId, updatedProd, false);
        return;
      }

      // SOTUV NARXI
      if (session.step.startsWith("edit_price:")) {
        const productId = session.step.split(":")[1];
        const nums = text.replace(/[^0-9 ]/g, "").trim().split(/\s+/).map(Number).filter(n => n > 0);
        if (nums.length === 0) {
          await callTelegram("sendMessage", { chat_id: chatId, text: "❌ Noto'g'ri narx! Qaytadan kiriting:" });
          return;
        }

        const newPrice = nums[0];
        const newOldPrice = nums.length > 1 ? nums[1] : undefined;
        const updateData = { price: newPrice, updated_at: new Date().toISOString() };
        if (newOldPrice) updateData.old_price = newOldPrice;

        await supabase.from("products").update(updateData).eq("id", productId);
        sessions.delete(chatId.toString());

        await callTelegram("sendMessage", {
          chat_id: chatId,
          text: `✅ <b>Sotuv narxi yangilandi:</b> <b>${newPrice.toLocaleString()} so'm</b>` + (newOldPrice ? ` (Eski: ${newOldPrice.toLocaleString()} so'm)` : ""),
          parse_mode: "HTML"
        });

        const { data: updatedProd } = await supabase.from("products").select("*").eq("id", productId).single();
        if (updatedProd) await sendProductForModeration(chatId, updatedProd, false);
        return;
      }

      // MODEL
      if (session.step.startsWith("edit_model:")) {
        const productId = session.step.split(":")[1];
        await supabase.from("products").update({ model: text, updated_at: new Date().toISOString() }).eq("id", productId);
        sessions.delete(chatId.toString());

        await callTelegram("sendMessage", { chat_id: chatId, text: `✅ <b>Model yangilandi:</b> <code>${text}</code>`, parse_mode: "HTML" });
        const { data: updatedProd } = await supabase.from("products").select("*").eq("id", productId).single();
        if (updatedProd) await sendProductForModeration(chatId, updatedProd, false);
        return;
      }

      // NOM
      if (session.step.startsWith("edit_name:")) {
        const productId = session.step.split(":")[1];
        await supabase.from("products").update({ name: text, name_uz: text, updated_at: new Date().toISOString() }).eq("id", productId);
        sessions.delete(chatId.toString());

        await callTelegram("sendMessage", { chat_id: chatId, text: `✅ <b>Nom yangilandi:</b>\n${text}`, parse_mode: "HTML" });
        const { data: updatedProd } = await supabase.from("products").select("*").eq("id", productId).single();
        if (updatedProd) await sendProductForModeration(chatId, updatedProd, false);
        return;
      }

      // CUSTOM BRAND
      if (session.step.startsWith("edit_brand_custom:")) {
        const productId = session.step.split(":")[1];
        let { data: bRow } = await supabase.from("brands").select("id").ilike("name", text).single();
        if (!bRow) {
          const { data: newB } = await supabase.from("brands").insert({ name: text, is_deleted: false }).select("id").single();
          bRow = newB;
        }

        if (bRow) {
          await supabase.from("products").update({ brand_id: bRow.id, updated_at: new Date().toISOString() }).eq("id", productId);
        }
        sessions.delete(chatId.toString());

        await callTelegram("sendMessage", { chat_id: chatId, text: `✅ <b>Brend yangilandi:</b> 🏷 ${text}`, parse_mode: "HTML" });
        const { data: updatedProd } = await supabase.from("products").select("*").eq("id", productId).single();
        if (updatedProd) await sendProductForModeration(chatId, updatedProd, false);
        return;
      }
    }

    // COMMANDS
    if (text === "/start" || text === "/review" || text === "/moderatsiya") {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `👋 <b>Velari Mahsulotlar Moderatsiya Boti</b>\n\n` +
          `🔍 Yangi mahsulotlar yuklanmoqda...`,
        parse_mode: "HTML"
      });

      const first = await getProductByOffset(null, 0);
      if (first) {
        await sendProductForModeration(chatId, first, true);
      }
      return;
    }

    if (text.startsWith("/find ")) {
      const q = text.slice(6).trim();
      const { data: matches } = await supabase
        .from("products")
        .select("*")
        .or(`sku.ilike.%${q}%,model.ilike.%${q}%,name.ilike.%${q}%`)
        .eq("is_deleted", false)
        .limit(1);

      if (matches && matches.length > 0) {
        await sendProductForModeration(chatId, matches[0], true);
      } else {
        await callTelegram("sendMessage", { chat_id: chatId, text: `❌ "${q}" bo'yicha mahsulot topilmadi.` });
      }
      return;
    }

    if (text === "/stats") {
      const { count: totalNew } = await supabase.from("products").select("*", { count: 'exact', head: true }).ilike("barcode", "478%").eq("is_deleted", false);
      const { count: withCost } = await supabase.from("products").select("*", { count: 'exact', head: true }).ilike("barcode", "478%").gt("cost_price", 0).eq("is_deleted", false);

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `📊 <b>Moderatsiya Statistikasi:</b>\n\n` +
          `📦 Jami yangi mahsulotlar: <b>${totalNew} ta</b>\n` +
          `💵 Tan narxi kiritilgan: <b>${withCost} ta</b>\n` +
          `⏳ Kutilmoqda: <b>${(totalNew || 0) - (withCost || 0)} ta</b>`,
        parse_mode: "HTML"
      });
      return;
    }
  }
}

async function startPolling() {
  console.log("-------------------------------------------------------");
  console.log("🤖 Velari Telegram Admin Moderation Bot ishga tushdi!");
  console.log(`📡 Bot Token: ${BOT_TOKEN.slice(0, 10)}... | Admin ID: ${ADMIN_ID}`);
  console.log("-------------------------------------------------------");

  // 1. Delete existing webhook to enable clean, direct Long-Polling
  await callTelegram("deleteWebhook", { drop_pending_updates: false });
  console.log("Webhook o'chirildi, to'g'ridan-to'g'ri Long-Polling faollashtirildi.");

  let offset = 0;
  while (true) {
    try {
      const resp = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=25`, {
        signal: AbortSignal.timeout(35000)
      });
      const data = await resp.json();

      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          try {
            await handleUpdate(update);
          } catch (err) {
            console.error("Update handling error:", err);
          }
        }
      }
    } catch (err) {
      // Timeout or network glitch — sleep 1s and continue
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

startPolling().catch(console.error);
