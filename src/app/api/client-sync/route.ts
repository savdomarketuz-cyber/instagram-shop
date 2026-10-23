import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionPhone, phoneDigits } from "@/lib/user-session";

export const dynamic = "force-dynamic";

// ── In-Memory Throttling & Deduplication Caches ──
// Vercel serverless konteyneri oqimida (warm state) takroriy va o'zgarmagan
// status/cart so'rovlarining DB ga keraksiz yozilishini to'xtatadi.
interface StatusCacheEntry {
    is_online: boolean;
    current_path?: string;
    last_action?: string;
    last_saved: number;
    user_phone?: string | null;
}

interface CartCacheEntry {
    itemsHash: string;
    last_saved: number;
}

const statusCache = new Map<string, StatusCacheEntry>();
const cartCache = new Map<string, CartCacheEntry>();
const MAX_STATUS_CACHE = 5000;
const MAX_CART_CACHE = 2000;

function pruneCache(map: Map<any, any>, maxSize: number) {
    if (map.size > maxSize) {
        const firstKey = map.keys().next().value;
        if (firstKey !== undefined) map.delete(firstKey);
    }
}

function cleanString(val: unknown, maxLen = 100): string | null {
    if (typeof val !== "string") return null;
    const trimmed = val.trim();
    return trimmed ? trimmed.slice(0, maxLen) : null;
}

const ID_REGEX = /^[a-zA-Z0-9_\-+:.]{3,100}$/;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { type, payload } = body;
        if (!type || !payload || typeof payload !== "object") {
            return NextResponse.json({ error: "Invalid type or payload" }, { status: 400 });
        }

        // ══════════════════════════════════════════════════════
        // 1. CART SYNC
        // ══════════════════════════════════════════════════════
        if (type === "cart") {
            const userPhoneRaw = cleanString(payload.user_phone, 30);
            if (!userPhoneRaw) {
                return NextResponse.json({ error: "Missing user_phone" }, { status: 400 });
            }

            const sessionPhone = await getSessionPhone(req);
            if (!sessionPhone || phoneDigits(sessionPhone) !== phoneDigits(userPhoneRaw)) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const items = Array.isArray(payload.items) ? payload.items : [];
            const sanitizedItems = items.slice(0, 100).map((item: any) => ({
                id: cleanString(item.id, 64) || "",
                quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 999)),
                name: cleanString(item.name, 150) || "",
                price: Math.max(0, Number(item.price) || 0),
                image: cleanString(item.image, 500) || ""
            })).filter((item: any) => Boolean(item.id));

            // Savat bo'sh bo'lsa — DB dan o'chirish
            if (sanitizedItems.length === 0) {
                cartCache.delete(userPhoneRaw);
                await supabaseAdmin.from("active_carts").delete().eq("user_phone", userPhoneRaw);
                return NextResponse.json({ success: true, action: "deleted" });
            }

            // Deduplication: Agar savat tarkibi o'zgarmagan bo'lsa va 5 daqiqa ichida yozilgan bo'lsa — DB ga yozilmaydi
            const itemsHash = sanitizedItems
                .map((i: any) => `${i.id}:${i.quantity}`)
                .sort()
                .join("|");

            const cachedCart = cartCache.get(userPhoneRaw);
            const now = Date.now();
            if (cachedCart && cachedCart.itemsHash === itemsHash && now - cachedCart.last_saved < 300_000) {
                return NextResponse.json({ success: true, skipped: true });
            }

            await supabaseAdmin.from("active_carts").upsert({
                user_phone: userPhoneRaw,
                items: sanitizedItems,
                updated_at: new Date().toISOString()
            }, { onConflict: "user_phone" });

            cartCache.set(userPhoneRaw, { itemsHash, last_saved: now });
            pruneCache(cartCache, MAX_CART_CACHE);

            return NextResponse.json({ success: true, action: "synced" });
        }

        // ══════════════════════════════════════════════════════
        // 2. USER STATUS (Heartbeat / Activity Tracking)
        // ══════════════════════════════════════════════════════
        if (type === "status" || type === "status_update") {
            const rawId = cleanString(payload.id, 100);
            if (!rawId || !ID_REGEX.test(rawId)) {
                return NextResponse.json({ error: "Invalid id" }, { status: 400 });
            }

            const isOnline = Boolean(payload.is_online);
            let verifiedPhone: string | null = null;
            let userType = "visitor";

            if (payload.user_phone) {
                const phoneCandidate = cleanString(payload.user_phone, 30);
                if (phoneCandidate) {
                    const sessionPhone = await getSessionPhone(req);
                    if (sessionPhone && phoneDigits(sessionPhone) === phoneDigits(phoneCandidate)) {
                        verifiedPhone = sessionPhone;
                        userType = "user";
                    }
                }
            }

            const currentPath = cleanString(payload.current_path, 120) || "";
            const lastAction = cleanString(payload.last_action, 80) || "";
            const now = Date.now();

            // ⚡ Throttling & Deduplication Tekshiruvi
            const cached = statusCache.get(rawId);
            if (cached) {
                const isSameOnline = cached.is_online === isOnline;
                const isSamePath = cached.current_path === currentPath;
                const isSameAction = cached.last_action === lastAction;
                const elapsed = now - cached.last_saved;

                // 1) Status to'liq bir xil bo'lsa va 120 soniya ichida yozilgan bo'lsa -> DB so'rovi chetlab o'tiladi
                if (isSameOnline && isSamePath && isSameAction && elapsed < 120_000) {
                    return NextResponse.json({ success: true, skipped: true });
                }

                // 2) Onlayn holat o'zgarmagan bo'lsa va oxirgi yozuvdan beri 15 soniyadan kam o'tgan bo'lsa (kliklar/sahifa skroll) -> DB so'rovi chetlab o'tiladi
                if (isSameOnline && elapsed < 15_000) {
                    return NextResponse.json({ success: true, throttled: true });
                }
            }

            // DB ga yozish kerak
            if (type === "status_update") {
                await supabaseAdmin.from("user_status").update({
                    is_online: isOnline,
                    updated_at: new Date().toISOString(),
                    last_seen: new Date().toISOString()
                }).eq("id", rawId);
            } else {
                const statusRecord: Record<string, any> = {
                    id: rawId,
                    is_online: isOnline,
                    user_phone: verifiedPhone,
                    type: userType,
                    updated_at: new Date().toISOString(),
                    last_seen: new Date().toISOString()
                };

                const cleanName = cleanString(payload.name, 80);
                if (cleanName) statusRecord.name = cleanName;
                if (currentPath) statusRecord.current_path = currentPath;
                if (lastAction) statusRecord.last_action = lastAction;

                const ip = cleanString(payload.ip_address, 45);
                if (ip) statusRecord.ip_address = ip;

                const deviceType = cleanString(payload.device_type, 30);
                if (deviceType) statusRecord.device_type = deviceType;

                const resolution = cleanString(payload.screen_resolution, 25);
                if (resolution) statusRecord.screen_resolution = resolution;

                const city = cleanString(payload.city, 60);
                if (city) statusRecord.city = city;

                const region = cleanString(payload.region, 60);
                if (region) statusRecord.region = region;

                const country = cleanString(payload.country, 60);
                if (country) statusRecord.country = country;

                const isp = cleanString(payload.isp, 60);
                if (isp) statusRecord.isp = isp;

                if (typeof payload.latitude === "number" && Number.isFinite(payload.latitude)) {
                    statusRecord.latitude = payload.latitude;
                }
                if (typeof payload.longitude === "number" && Number.isFinite(payload.longitude)) {
                    statusRecord.longitude = payload.longitude;
                }

                await supabaseAdmin.from("user_status").upsert(statusRecord, { onConflict: "id" });
            }

            // Keshni yangilaymiz
            statusCache.set(rawId, {
                is_online: isOnline,
                current_path: currentPath,
                last_action: lastAction,
                last_saved: now,
                user_phone: verifiedPhone
            });
            pruneCache(statusCache, MAX_STATUS_CACHE);

            return NextResponse.json({ success: true, action: "updated" });
        }

        return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
    } catch (error: any) {
        console.error("Client sync error:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}
