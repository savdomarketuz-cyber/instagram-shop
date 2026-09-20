#!/usr/bin/env node

/**
 * Velari E-commerce — To'liq Tizim Diagnostikasi (Smoke & Health Check)
 * 
 * Barcha frontend-to-backend API va ma'lumotlar bazasi funksiyalarini
 * 100% avtomatlashgan tarzda tekshiradi.
 * 
 * Ishlatish:
 *   node scripts/health-check.mjs
 *   node scripts/health-check.mjs --telegram    (Telegram adminga ham yuborish)
 */

import fs from "fs";
import path from "path";

// .env.local faylini o'qish (tashqi kutubxonalarsiz)
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), ".env.local");
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, "utf8");
            for (const line of content.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) continue;
                const eqIdx = trimmed.indexOf("=");
                if (eqIdx > 0) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("⚠️ .env.local faylini o'qishda ogohlantirish:", e.message);
    }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || "5572037414";

const shouldNotifyTelegram = process.argv.includes("--telegram") || process.argv.includes("-t");

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("❌ Xatolik: NEXT_PUBLIC_SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY topilmadi!");
    process.exit(1);
}

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m"
};

async function supabaseFetch(endpoint, options = {}) {
    const url = `${SUPABASE_URL}${endpoint}`;
    const headers = {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
}

async function runTest(id, name, testFn) {
    const start = Date.now();
    try {
        const res = await testFn();
        const latency = Date.now() - start;
        return {
            id,
            name,
            status: res.status || "pass",
            latency,
            summary: res.summary,
            details: res.details
        };
    } catch (err) {
        const latency = Date.now() - start;
        return {
            id,
            name,
            status: "fail",
            latency,
            summary: "Xatolik",
            error: err.message || String(err)
        };
    }
}

async function main() {
    console.log(`\n${colors.bright}${colors.cyan}====================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}   🩺 VELARI E-COMMERCE TIZIM DIAGNOSTIKASI   ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}====================================================${colors.reset}\n`);

    const tests = [];

    // 1. Supabase Ping & Latency
    tests.push(await runTest("db_latency", "Supabase DB Ulanishi & Latency", async () => {
        const res = await supabaseFetch("/rest/v1/products?select=id&limit=1");
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        return { summary: "Baza ulanishi faol" };
    }));

    // 2. Typeahead Suggest RPC
    tests.push(await runTest("suggest_rpc", "Typeahead RPC (suggest_products)", async () => {
        const res = await supabaseFetch("/rest/v1/rpc/suggest_products", {
            method: "POST",
            body: JSON.stringify({ search_query: "a", match_count: 3 })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { summary: `${Array.isArray(data) ? data.length : 0} ta taklif qaytdi` };
    }));

    // 3. Advanced Smart Search RPC
    tests.push(await runTest("search_rpc", "Smart Search RPC (advanced_smart_search)", async () => {
        const res = await supabaseFetch("/rest/v1/rpc/advanced_smart_search", {
            method: "POST",
            body: JSON.stringify({
                search_query: "ko'ylak",
                match_threshold: 0.1,
                match_count: 5,
                p_offset: 0
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { summary: `Smart qidiruv faol (${Array.isArray(data) ? data.length : 0} ta natija)` };
    }));

    // 4. Search Synonyms
    tests.push(await runTest("search_synonyms", "Qidiruv Lug'ati (search_synonyms)", async () => {
        const res = await supabaseFetch("/rest/v1/search_synonyms?select=keyword,maps_to&limit=5");
        if (!res.ok) return { status: "warn", summary: "Jadval topilmadi" };
        const data = await res.json();
        return { summary: `${Array.isArray(data) ? data.length : 0} ta namunaviy sinonim mavjud` };
    }));

    // 5. Categories
    tests.push(await runTest("categories", "Katalog Toifalari (categories)", async () => {
        const res = await supabaseFetch("/rest/v1/categories?select=id,name,name_uz,name_ru&limit=5");
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { summary: `${Array.isArray(data) ? data.length : 0} ta toifa tekshirildi` };
    }));

    // 6. Products & Stock Sanity
    tests.push(await runTest("products", "Mahsulotlar & Narxlar Sanity", async () => {
        const res = await supabaseFetch("/rest/v1/products?select=id,name,price,stock&is_deleted=eq.false&limit=10");
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        const invalid = (data || []).filter(p => !p.price || Number(p.price) <= 0);
        if (invalid.length > 0) return { status: "warn", summary: `${invalid.length} ta tovar narxsiz!` };
        return { summary: `${(data || []).length} ta mahsulot narxi to'g'ri` };
    }));

    // 7. Orders System
    tests.push(await runTest("orders", "Buyurtmalar Tizimi (orders)", async () => {
        const res = await supabaseFetch("/rest/v1/orders?select=id,total,status&order=created_at.desc&limit=3");
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { summary: `Buyurtmalar bazasi faol (${(data || []).length} ta so'nggi)` };
    }));

    // 8. Promo Codes
    tests.push(await runTest("promo_codes", "Chegirma va Promokodlar", async () => {
        const res = await supabaseFetch("/rest/v1/promo_codes?select=id,code&limit=5");
        if (!res.ok) return { status: "warn", summary: "Promokodlar jadvali bo'sh yoki yo'q" };
        const data = await res.json();
        return { summary: `${(data || []).length} ta promokod bazada` };
    }));

    // 9. Users System
    tests.push(await runTest("users", "Mijozlar Bazasi (users)", async () => {
        const res = await supabaseFetch("/rest/v1/users?select=id,phone&order=created_at.desc&limit=3");
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { summary: `Mijozlar ro'yxati tekshirildi (${(data || []).length} ta)` };
    }));

    // 10. Support Chat
    tests.push(await runTest("support_chats", "Mijozlar bilan Chat (support_chats)", async () => {
        const res = await supabaseFetch("/rest/v1/support_chats?select=id,unread_by_admin&limit=5");
        if (!res.ok) return { status: "warn", summary: "Support chats jadvali topilmadi" };
        const data = await res.json();
        return { summary: `${(data || []).length} ta faol chat sessiyasi mavjud` };
    }));

    // 11. Telegram Bot API
    tests.push(await runTest("telegram_bot", "Telegram Admin Bot API", async () => {
        if (!ADMIN_BOT_TOKEN) return { status: "fail", summary: "TELEGRAM_ADMIN_BOT_TOKEN yo'q" };
        const res = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getMe`, {
            signal: AbortSignal.timeout(5000)
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.description);
        return { summary: `@${data.result.username} muvaffaqiyatli javob berdi` };
    }));

    // 12. Storage Buckets
    tests.push(await runTest("storage", "Supabase Media Storage", async () => {
        const res = await supabaseFetch("/storage/v1/bucket");
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { summary: `${(data || []).length} ta storage bucket mavjud` };
    }));

    // Output CLI Results
    let passed = 0;
    let warnings = 0;
    let failed = 0;

    console.log("┌──────────────────────────────────────────────┬────────┬──────────┬────────────────────────────────┐");
    console.log("│ Tekshiruv Nomi                               │ Holat  │ Vaqt     │ Xulosa                         │");
    console.log("├──────────────────────────────────────────────┼────────┼──────────┼────────────────────────────────┤");

    for (const t of tests) {
        let statusTag = `${colors.green}  OK   ${colors.reset}`;
        if (t.status === "warn") {
            statusTag = `${colors.yellow} WARN  ${colors.reset}`;
            warnings++;
        } else if (t.status === "fail") {
            statusTag = `${colors.red} FAIL  ${colors.reset}`;
            failed++;
        } else {
            passed++;
        }

        const namePadded = t.name.padEnd(44).slice(0, 44);
        const timePadded = `${t.latency}ms`.padStart(8);
        const summaryPadded = (t.error || t.summary).padEnd(30).slice(0, 30);

        console.log(`│ ${namePadded} │${statusTag}│ ${timePadded} │ ${summaryPadded} │`);
    }

    console.log("└──────────────────────────────────────────────┴────────┴──────────┴────────────────────────────────┘");

    const total = tests.length;
    const score = Math.round(((passed + warnings * 0.5) / total) * 100);

    console.log(`\n📊 Natijalar: ${colors.green}✅ ${passed} Pass${colors.reset} | ${colors.yellow}⚠️ ${warnings} Warn${colors.reset} | ${colors.red}❌ ${failed} Fail${colors.reset}`);
    console.log(`⭐ Sog'lomlik Darajasi: ${colors.bright}${score}%${colors.reset}\n`);

    // Telegramga yuborish (agar --telegram flag berilgan bo'lsa)
    if (shouldNotifyTelegram && ADMIN_BOT_TOKEN && ADMIN_ID) {
        console.log("📨 Natijalar Telegram orqali adminga yuborilmoqda...");
        try {
            let msg = `🩺 <b>VELARI TIZIM DIAGNOSTIKASI (CLI)</b>\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n`;
            msg += `${failed === 0 ? "🟢 BARCHA TIZIMLAR 100% ISHLAMOQDA" : "🔴 TIZIMDA XATOLIK ANIQLANDI!"}\n\n`;
            msg += `📊 <b>Sog'lomlik darajasi:</b> ${score}%\n`;
            msg += `📈 <b>Natijalar:</b> ✅ ${passed} | ⚠️ ${warnings} | ❌ ${failed}\n\n`;

            for (const t of tests) {
                const icon = t.status === "pass" ? "✅" : t.status === "warn" ? "⚠️" : "❌";
                msg += `${icon} <b>${t.name}</b> (${t.latency}ms): <i>${t.error || t.summary}</i>\n`;
            }

            await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: ADMIN_ID, text: msg, parse_mode: "HTML" })
            });
            console.log("✅ Telegramga muvaffaqiyatli yuborildi!");
        } catch (e) {
            console.error("❌ Telegramga yuborishda xato:", e.message);
        }
    }

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
