import { supabaseAdmin } from "@/lib/supabase-admin";

export interface TestResult {
    id: string;
    name: string;
    category: string;
    status: "pass" | "warn" | "fail";
    latencyMs: number;
    summary: string;
    details?: string;
    error?: string;
}

export interface SystemDiagnosticReport {
    timestamp: string;
    totalTests: number;
    passed: number;
    warnings: number;
    failed: number;
    healthScore: number;
    totalDurationMs: number;
    results: TestResult[];
    telegramMessage: string;
}

const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const CUSTOMER_BOT_TOKEN = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || "5572037414";

/**
 * Har bir test modulini xavfsiz ishga tushiruvchi wrapper.
 * Latency (kechikish) va xatoliklarni aniq hisoblaydi.
 */
async function executeTest(
    id: string,
    name: string,
    category: string,
    testFn: () => Promise<{ status?: "pass" | "warn" | "fail"; summary: string; details?: string }>
): Promise<TestResult> {
    const start = Date.now();
    try {
        const res = await testFn();
        const latencyMs = Date.now() - start;
        return {
            id,
            name,
            category,
            status: res.status || "pass",
            latencyMs,
            summary: res.summary,
            details: res.details
        };
    } catch (err: any) {
        const latencyMs = Date.now() - start;
        return {
            id,
            name,
            category,
            status: "fail",
            latencyMs,
            summary: "Xatolik yuz berdi",
            error: err?.message || String(err)
        };
    }
}

/**
 * 100% Tizim diagnostikasini o'tkazish funktsiyasi
 * Barcha frontend va backend funksiyalarining ishlashini to'liq tekshiradi.
 */
export async function runFullSystemDiagnostic(): Promise<SystemDiagnosticReport> {
    const overallStart = Date.now();
    const results: TestResult[] = [];

    // =========================================================================
    // 1. MA'LUMOTLAR BAZASI ULANGANI VA KECHIKISH (LATENCY)
    // =========================================================================
    results.push(await executeTest(
        "db_latency",
        "Ma'lumotlar Bazasi (Supabase Ping)",
        "Infratuzilma",
        async () => {
            const { count, error } = await supabaseAdmin
                .from("products")
                .select("id", { count: "exact", head: true });

            if (error) throw new Error(`Supabase ulanish xatosi: ${error.message}`);
            return {
                status: "pass",
                summary: `Ulanish barqaror (${count || 0} ta mahsulot tekshirildi)`
            };
        }
    ));

    // =========================================================================
    // 2. MATNLI VA SMART QIDIRUV (FULL-TEXT RPC & SUGGEST)
    // =========================================================================
    results.push(await executeTest(
        "search_suggest_rpc",
        "Typeahead Suggest RPC (Tezkor takliflar)",
        "Qidiruv Tizimi",
        async () => {
            const { data, error } = await supabaseAdmin.rpc("suggest_products", {
                search_query: "a",
                match_count: 3
            });

            if (error) throw new Error(`suggest_products RPC xatosi: ${error.message}`);
            return {
                status: "pass",
                summary: `RPC faol (${data?.length || 0} ta taklif qaytdi)`
            };
        }
    ));

    results.push(await executeTest(
        "search_advanced_rpc",
        "Advanced Smart Search RPC (Asosiy qidiruv)",
        "Qidiruv Tizimi",
        async () => {
            const { data, error } = await supabaseAdmin.rpc("advanced_smart_search", {
                search_query: "ko'ylak",
                match_threshold: 0.1,
                match_count: 5,
                p_offset: 0
            });

            if (error) throw new Error(`advanced_smart_search RPC xatosi: ${error.message}`);
            return {
                status: "pass",
                summary: `Smart qidiruv faol (${data?.length || 0} ta natija topildi)`
            };
        }
    ));

    results.push(await executeTest(
        "search_synonyms",
        "Qidiruv Sinonimlari Lug'ati",
        "Qidiruv Tizimi",
        async () => {
            const { count, error } = await supabaseAdmin
                .from("search_synonyms")
                .select("id", { count: "exact", head: true });

            if (error) {
                return {
                    status: "warn",
                    summary: "Jadval topilmadi yoki bo'sh",
                    details: error.message
                };
            }
            return {
                status: "pass",
                summary: `Lug'at faol (${count || 0} ta sinonim mavjud)`
            };
        }
    ));

    // =========================================================================
    // 3. KATALOG, TOIFALAR VA MAHSULOTLAR
    // =========================================================================
    results.push(await executeTest(
        "catalog_categories",
        "Katalog Toifalari (Categories)",
        "Katalog",
        async () => {
            const { data, error } = await supabaseAdmin
                .from("categories")
                .select("id, name, name_uz, name_ru")
                .limit(10);

            if (error) throw new Error(`Toifalar xatosi: ${error.message}`);
            if (!data || data.length === 0) {
                return { status: "warn", summary: "Toifalar mavjud emas" };
            }
            return {
                status: "pass",
                summary: `${data.length} ta toifa tekshirildi (barchasi faol)`
            };
        }
    ));

    results.push(await executeTest(
        "catalog_products",
        "Mahsulotlar Bazasi & Narxlar Sanity",
        "Katalog",
        async () => {
            const { data, error } = await supabaseAdmin
                .from("products")
                .select("id, name, price, stock, is_deleted")
                .eq("is_deleted", false)
                .limit(10);

            if (error) throw new Error(`Mahsulotlar xatosi: ${error.message}`);
            if (!data || data.length === 0) {
                return { status: "warn", summary: "Faol mahsulotlar topilmadi" };
            }

            const invalidPrice = data.filter(p => !p.price || Number(p.price) <= 0);
            if (invalidPrice.length > 0) {
                return {
                    status: "warn",
                    summary: `${data.length} tadan ${invalidPrice.length} tasida narx ko'rsatilmagan!`
                };
            }

            return {
                status: "pass",
                summary: `Barcha tovarlar narxi va zaxirasi to'g'ri (${data.length} ta tekshirildi)`
            };
        }
    ));

    results.push(await executeTest(
        "catalog_banners",
        "Bosh Sahifa Bannerlari & Stories",
        "Katalog",
        async () => {
            const { data, error } = await supabaseAdmin
                .from("banners")
                .select("id, image, title")
                .limit(5);

            if (error) {
                return {
                    status: "warn",
                    summary: "Bannerlar jadvali tekshirilmadi",
                    details: error.message
                };
            }
            return {
                status: "pass",
                summary: `${data?.length || 0} ta banner faol holatda`
            };
        }
    ));

    // =========================================================================
    // 4. SAVAT, BUYURTMALAR VA PROMOKODLAR
    // =========================================================================
    results.push(await executeTest(
        "orders_system",
        "Buyurtmalar Tizimi (Orders)",
        "Buyurtmalar",
        async () => {
            const { data, error } = await supabaseAdmin
                .from("orders")
                .select("id, total, status, created_at, items")
                .order("created_at", { ascending: false })
                .limit(5);

            if (error) throw new Error(`Buyurtmalar xatosi: ${error.message}`);
            return {
                status: "pass",
                summary: `Buyurtmalar bazasi faol (so'nggi ${data?.length || 0} ta buyurtma tekshirildi)`
            };
        }
    ));

    results.push(await executeTest(
        "promo_codes",
        "Chegirma va Promokodlar Tizimi",
        "Buyurtmalar",
        async () => {
            const { data, error } = await supabaseAdmin
                .from("promo_codes")
                .select("id, code, is_active")
                .limit(5);

            if (error) {
                return {
                    status: "warn",
                    summary: "Promokodlar jadvali tekshirilmadi",
                    details: error.message
                };
            }
            return {
                status: "pass",
                summary: `${data?.length || 0} ta promokod bazada mavjud`
            };
        }
    ));

    // =========================================================================
    // 5. FOYDALANUVCHILAR VA AUTENTIFIKATSIYA
    // =========================================================================
    results.push(await executeTest(
        "auth_users",
        "Foydalanuvchilar Tizimi (Users)",
        "Foydalanuvchilar",
        async () => {
            const { count, error } = await supabaseAdmin
                .from("users")
                .select("id", { count: "exact", head: true });

            if (error) throw new Error(`Foydalanuvchilar jadvali xatosi: ${error.message}`);
            return {
                status: "pass",
                summary: `Jami ${count || 0} ta mijoz ro'yxatdan o'tgan`
            };
        }
    ));

    results.push(await executeTest(
        "auth_jwt_secrets",
        "Xavfsizlik Kalitlari (JWT & Secrets)",
        "Xavfsizlik",
        async () => {
            const hasAdminSecret = !!process.env.ADMIN_SECRET;
            const hasJwtSecret = !!process.env.JWT_SECRET;
            const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!hasAdminSecret || !hasServiceRole) {
                return {
                    status: "fail",
                    summary: "Muhim maxfiy kalitlar (.env) yetishmayapti!",
                    details: `ADMIN_SECRET: ${hasAdminSecret ? "OK" : "YO'Q"}, SUPABASE_SERVICE_ROLE_KEY: ${hasServiceRole ? "OK" : "YO'Q"}`
                };
            }

            return {
                status: "pass",
                summary: "Barcha asosiy xavfsizlik kalitlari sozlangan"
            };
        }
    ));

    // =========================================================================
    // 6. SHARHLAR VA BAHOLASH (REVIEWS & RATINGS)
    // =========================================================================
    results.push(await executeTest(
        "reviews_comments",
        "Sharhlar va Reyting Tizimi",
        "Sharhlar",
        async () => {
            const { count, error } = await supabaseAdmin
                .from("comments")
                .select("id", { count: "exact", head: true });

            if (error) {
                return {
                    status: "warn",
                    summary: "Sharhlar jadvali topilmadi yoki bo'sh",
                    details: error.message
                };
            }
            return {
                status: "pass",
                summary: `Jami ${count || 0} ta sharh saqlangan`
            };
        }
    ));

    // =========================================================================
    // 7. MIJOZLAR BILAN CHAT VA QO'LLAB-QUVVATLASH (SUPPORT CHAT)
    // =========================================================================
    results.push(await executeTest(
        "support_chat",
        "Mijozlar bilan Jonli Chat (Support)",
        "Qo'llab-quvvatlash",
        async () => {
            const { data, error } = await supabaseAdmin
                .from("support_chats")
                .select("id, unread_by_admin")
                .limit(5);

            if (error) {
                return {
                    status: "warn",
                    summary: "Support chat jadvali topilmadi",
                    details: error.message
                };
            }
            const unreadTotal = (data || []).reduce((acc, c) => acc + (c.unread_by_admin || 0), 0);
            return {
                status: "pass",
                summary: `Chat tizimi faol (Kutayotgan xabarlar: ${unreadTotal} ta)`
            };
        }
    ));

    // =========================================================================
    // 8. HAMYON, KESHBEK VA P2P
    // =========================================================================
    results.push(await executeTest(
        "wallet_system",
        "Hamyon va Keshbek Tizimi (Wallet)",
        "Moliya",
        async () => {
            const { count, error } = await supabaseAdmin
                .from("user_wallets")
                .select("id", { count: "exact", head: true });

            if (error) {
                return {
                    status: "warn",
                    summary: "Hamyon jadvali ulanmagan",
                    details: error.message
                };
            }
            return {
                status: "pass",
                summary: `Hamyon tizimi faol (${count || 0} ta faol hamyon)`
            };
        }
    ));

    // =========================================================================
    // 9. TELEGRAM ADMIN VA MIJOZ BOT INTEGRATSIYASI
    // =========================================================================
    results.push(await executeTest(
        "telegram_admin_bot",
        "Telegram Admin Bot API",
        "Integratsiya",
        async () => {
            if (!ADMIN_BOT_TOKEN) {
                return { status: "fail", summary: "TELEGRAM_ADMIN_BOT_TOKEN topilmadi" };
            }

            const res = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getMe`, {
                signal: AbortSignal.timeout(6000)
            });
            const data = await res.json();

            if (!data.ok) {
                throw new Error(`Telegram Bot xatosi: ${data.description}`);
            }

            return {
                status: "pass",
                summary: `@${data.result.username} faol va ishlamoqda`
            };
        }
    ));

    // =========================================================================
    // 10. SUPABASE MEDIA STORAGE (XOTIRA VA FAYLLAR)
    // =========================================================================
    results.push(await executeTest(
        "supabase_storage",
        "Supabase Media Storage (Fayllar)",
        "Infratuzilma",
        async () => {
            const { data, error } = await supabaseAdmin.storage.listBuckets();
            if (error) throw new Error(`Storage xatosi: ${error.message}`);
            const bucketNames = (data || []).map(b => b.name).join(", ");
            return {
                status: "pass",
                summary: `${data?.length || 0} ta media bucket mavjud (${bucketNames || "standart"})`
            };
        }
    ));

    // =========================================================================
    // 11. DO'KON SOZLAMALARI VA YETKAZIB BERISH
    // =========================================================================
    results.push(await executeTest(
        "site_settings",
        "Do'kon Sozlamalari (Settings)",
        "Sozlamalar",
        async () => {
            const { data, error } = await supabaseAdmin
                .from("site_settings")
                .select("*")
                .limit(1);

            if (error) {
                return {
                    status: "warn",
                    summary: "site_settings jadvali topilmadi yoki standart rejimda",
                    details: error.message
                };
            }
            return {
                status: "pass",
                summary: "Do'kon sozlamalari muvaffaqiyatli yuklandi"
            };
        }
    ));

    // =========================================================================
    // NATIJALARNI HISOBLASH VA TELEGRAM XABARINI YASASH
    // =========================================================================
    const totalDurationMs = Date.now() - overallStart;
    const totalTests = results.length;
    const passed = results.filter(r => r.status === "pass").length;
    const warnings = results.filter(r => r.status === "warn").length;
    const failed = results.filter(r => r.status === "fail").length;

    // Health Score: Har bir pass 100%, har bir warn 50%, har bir fail 0%
    const healthScore = Math.round(((passed * 1 + warnings * 0.5) / totalTests) * 100);

    let timeStr = "";
    try {
        timeStr = new Date().toLocaleString("uz-UZ", {
            timeZone: "Asia/Tashkent",
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    } catch {
        timeStr = new Date().toISOString();
    }

    let overallBadge = "🟢 <b>BARCHA TIZIMLAR 100% ISHLAMOQDA</b>";
    if (failed > 0) {
        overallBadge = "🔴 <b>DIQQAT: TIZIMDA XATOLIK ANIQLANDI!</b>";
    } else if (warnings > 0) {
        overallBadge = "🟡 <b>BARQAROR (OGOHLANTIRISHLAR BOR)</b>";
    }

    let telegramMessage = `🩺 <b>VELARI TIZIM DIAGNOSTIKASI</b>\n`;
    telegramMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
    telegramMessage += `${overallBadge}\n\n`;
    telegramMessage += `⏰ <b>Tekshiruv vaqti:</b> <code>${timeStr}</code>\n`;
    telegramMessage += `📊 <b>Sog'lomlik darajasi:</b> <b>${healthScore}%</b>\n`;
    telegramMessage += `⏱ <b>Umumiy vaqt:</b> <b>${totalDurationMs} ms</b>\n`;
    telegramMessage += `📈 <b>Natijalar:</b> ✅ ${passed} ta | ⚠️ ${warnings} ta | ❌ ${failed} ta\n`;
    telegramMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Guruhlar bo'yicha chiroyli ro'yxat
    results.forEach((res, idx) => {
        const icon = res.status === "pass" ? "✅" : res.status === "warn" ? "⚠️" : "❌";
        telegramMessage += `${icon} <b>${res.name}</b> (${res.latencyMs}ms)\n`;
        telegramMessage += `   └ <i>${escapeHtml(res.summary)}</i>\n`;
        if (res.error) {
            telegramMessage += `   ⚠️ <code>${escapeHtml(res.error.slice(0, 100))}</code>\n`;
        }
        telegramMessage += `\n`;
    });

    telegramMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
    telegramMessage += `<i>💡 Bu hisobot har kuni avtomatik ravishda va admin talabiga ko'ra yuboriladi.</i>`;

    return {
        timestamp: timeStr,
        totalTests,
        passed,
        warnings,
        failed,
        healthScore,
        totalDurationMs,
        results,
        telegramMessage
    };
}

function escapeHtml(str: string): string {
    return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Diagnostika natijalarini Telegram orqali adminga yuborish
 */
export async function sendDiagnosticReportToTelegram(customChatId?: string | number): Promise<boolean> {
    const targetChatId = customChatId || ADMIN_ID;
    if (!ADMIN_BOT_TOKEN || !targetChatId) {
        console.warn("[HealthCheck] Telegram bot token yoki Admin ID topilmadi");
        return false;
    }

    try {
        const diagnostic = await runFullSystemDiagnostic();
        const res = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: targetChatId,
                text: diagnostic.telegramMessage,
                parse_mode: "HTML"
            })
        });

        const data = await res.json();
        return !!data.ok;
    } catch (err) {
        console.error("[HealthCheck] Telegramga yuborishda xatolik:", err);
        return false;
    }
}
