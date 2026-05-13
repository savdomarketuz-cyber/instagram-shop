import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pingSitemapToGoogle } from "@/lib/google-indexing";
import { sendCartReminder, sendPriceDropAlert, sendLowStockAlert } from "@/lib/telegram";

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Muddati o'tgan buyurtmalarni tozalash
        const { error } = await supabaseAdmin.rpc('restore_expired_orders');
        if (error) throw error;

        // 2. Google sitemap ping — har kuni xabar berish
        const sitemapPinged = await pingSitemapToGoogle();

        // 3. 🛒 Savat tashlab ketganlar eslatmasi
        // active_carts jadvalidan 24-48 soat oralig'idagi savatlar
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data: abandonedCarts } = await supabaseAdmin
            .from("active_carts")
            .select("user_phone, items, updated_at")
            .lt("updated_at", oneDayAgo)
            .gt("updated_at", twoDaysAgo)
            .neq("user_phone", "anonymous");

        let cartRemindersSent = 0;
        if (abandonedCarts && abandonedCarts.length > 0) {
            // Collect all unique product IDs to enrich items with name/price
            const allIds = Array.from(new Set(
                abandonedCarts.flatMap((c: any) => (c.items || []).map((i: any) => i.id).filter(Boolean))
            ));

            let productMap = new Map<string, any>();
            if (allIds.length > 0) {
                const { data: prods } = await supabaseAdmin.from("products").select("id, name, price").in("id", allIds);
                if (prods) productMap = new Map(prods.map(p => [p.id, p]));
            }

            for (const cart of abandonedCarts as any[]) {
                const cartItems = (cart.items || []) as any[];
                if (cartItems.length === 0) continue;

                // Check user hasn't ordered recently
                const { data: recentOrder } = await supabaseAdmin
                    .from("orders")
                    .select("id")
                    .eq("user_phone", cart.user_phone)
                    .gt("created_at", oneDayAgo)
                    .limit(1)
                    .single();

                if (!recentOrder) {
                    // Enrich items with name and price from products table
                    const enrichedItems = cartItems.map((item: any) => {
                        const prod = productMap.get(item.id);
                        return { ...item, name: prod?.name || item.name || "Mahsulot", price: prod?.price || item.price || 0 };
                    });
                    const result = await sendCartReminder(cart.user_phone, enrichedItems);
                    if (result?.success) cartRemindersSent++;
                }
            }
        }

        // 4. 💸 Narx tushgan mahsulotlar — wishlist egalariga xabar
        let priceDropAlertsSent = 0;
        try {
            const { data: wishlistRows } = await supabaseAdmin
                .from("user_wishlists")
                .select("user_phone, product_id, saved_price, product_name");

            if (wishlistRows && wishlistRows.length > 0) {
                // Unique product IDs
                const productIds = Array.from(new Set(wishlistRows.map((r: any) => r.product_id as string)));
                const { data: products } = await supabaseAdmin
                    .from("products")
                    .select("id, name, price")
                    .in("id", productIds)
                    .eq("is_deleted", false);

                if (products && products.length > 0) {
                    const priceMap = new Map(products.map((p: any) => [p.id, p]));

                    // Group by user_phone
                    const byUser = new Map<string, { name: string; oldPrice: number; newPrice: number }[]>();
                    for (const row of wishlistRows as any[]) {
                        const current = priceMap.get(row.product_id);
                        if (!current) continue;
                        // Alert only if price dropped by at least 3%
                        const drop = row.saved_price - current.price;
                        if (drop > 0 && drop / row.saved_price >= 0.03) {
                            if (!byUser.has(row.user_phone)) byUser.set(row.user_phone, []);
                            byUser.get(row.user_phone)!.push({
                                name: row.product_name || current.name,
                                oldPrice: row.saved_price,
                                newPrice: current.price
                            });
                        }
                    }

                    for (const [phone, drops] of Array.from(byUser.entries())) {
                        const result = await sendPriceDropAlert(phone, drops);
                        if (result?.success) {
                            priceDropAlertsSent++;
                            // Update saved_price so we don't alert again for same drop
                            for (const drop of drops) {
                                const row = (wishlistRows as any[]).find(r => r.user_phone === phone && r.product_name === drop.name);
                                if (row) {
                                    await supabaseAdmin.from("user_wishlists")
                                        .update({ saved_price: drop.newPrice })
                                        .eq("user_phone", phone)
                                        .eq("product_id", row.product_id);
                                }
                            }
                        }
                    }
                }
            }
        } catch(e) {
            console.error("Price drop cron error:", e);
        }

        // 5. ⚠️ Mahsulot tugamoqda — admin xabardor qilish (stok ≤ 5)
        let lowStockAlertsCount = 0;
        try {
            const { data: lowStockProducts } = await supabaseAdmin
                .from("products")
                .select("id, name, stock_details")
                .eq("is_deleted", false);

            if (lowStockProducts) {
                const lowItems = lowStockProducts
                    .map((p: any) => {
                        const total = p.stock_details
                            ? Object.values(p.stock_details).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0)
                            : 0;
                        return { name: p.name, stock: total as number };
                    })
                    .filter(p => p.stock > 0 && p.stock <= 5);

                if (lowItems.length > 0) {
                    await sendLowStockAlert(lowItems);
                    lowStockAlertsCount = lowItems.length;
                }
            }
        } catch(e) {
            console.error("Low stock alert error:", e);
        }

        return NextResponse.json({
            success: true,
            message: "Cron tasks completed",
            sitemapPinged,
            cartRemindersSent,
            priceDropAlertsSent,
            lowStockAlertsCount
        });
    } catch(e: any) {
        console.error("Cron Error: ", e);
        return NextResponse.json({ success: false, error: e.message });
    }
}
