import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";
import { revalidatePath } from "next/cache";
import { sendOrderStatusNotification } from "@/lib/telegram";

function performSmartRevalidation(table: string, payload: any, matchConfig: any) {
    try {
        if (table === "products") {
            const id = payload?.id || (matchConfig?.column === "id" ? matchConfig.value : null);
            if (id) {
                revalidatePath(`/uz/products/${id}`);
                revalidatePath(`/ru/products/${id}`);
            }
            revalidatePath("/uz/catalog");
            revalidatePath("/ru/catalog");
            revalidatePath("/uz");
            revalidatePath("/ru");
            revalidatePath("/sitemap.xml");
        } else if (table === "categories") {
            revalidatePath("/uz/catalog");
            revalidatePath("/ru/catalog");
            revalidatePath("/uz");
            revalidatePath("/ru");
            revalidatePath("/sitemap.xml");
        } else if (table === "banners" || table === "site_settings" || table === "settings") {
            revalidatePath("/uz");
            revalidatePath("/ru");
        }
    } catch (e) {
        console.error("Smart revalidation error:", e);
    }
}


/**
 * Universal Admin CRUD API
 * supabaseAdmin orqali RLS ni chetlab o'tib, barcha jadvallar uchun umumiy yozish operatsiyalari.
 */

async function verifyAdmin(req: NextRequest) {
    const adminToken = req.cookies.get("admin_token")?.value;
    const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim();
    if (!ADMIN_SECRET || !adminToken) return false;
    const payload = await verifyJwt(adminToken, ADMIN_SECRET);
    return payload && payload.role === "admin";
}

export async function POST(req: NextRequest) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { table, action, payload, matchConfig, inConfig, onConflict, fn, args, orderBy, limit } = await req.json();

        // RPC chaqiruvi (admin RLS chetlab o'tib funksiya bajaradi, masalan hamyon balansini o'zgartirish)
        if (action === "rpc") {
            if (!fn) return NextResponse.json({ error: "Function name (fn) is required" }, { status: 400 });
            const { data, error } = await supabaseAdmin.rpc(fn, args || {});
            if (error) throw error;
            return NextResponse.json({ success: true, data });
        }

        if (!table) return NextResponse.json({ error: "Table is required" }, { status: 400 });

        let query = supabaseAdmin.from(table);

        if (action === "select") {
            // RLS chetlab o'tib o'qish (admin sahifalarda sozlamalarni yuklash uchun)
            let selectQuery: any = query.select(payload?.columns || "*");
            if (matchConfig) selectQuery = selectQuery.eq(matchConfig.column, matchConfig.value);
            if (inConfig) selectQuery = selectQuery.in(inConfig.column, inConfig.values);
            if (orderBy) selectQuery = selectQuery.order(orderBy.column, { ascending: orderBy.ascending ?? true });
            if (limit) selectQuery = selectQuery.limit(limit);
            const { data, error } = payload?.single
                ? await selectQuery.maybeSingle()
                : await selectQuery;
            if (error) throw error;
            return NextResponse.json({ success: true, data });
        }
        else if (action === "insert") {
            const { data, error } = await query.insert(payload).select();
            if (error) throw error;
            
            performSmartRevalidation(table, payload, matchConfig);
            
            return NextResponse.json({ success: true, data });
        } 
        else if (action === "update") {
            if (!matchConfig && !inConfig) return NextResponse.json({ error: "Match config required for update" }, { status: 400 });
            
            let updateQuery: any = query.update(payload);
            
            if (matchConfig) {
                // simple equal match: { column: "id", value: "123" }
                updateQuery = updateQuery.eq(matchConfig.column, matchConfig.value);
            }
            if (inConfig) {
                // in match: { column: "id", values: ["123", "456"] }
                updateQuery = updateQuery.in(inConfig.column, inConfig.values);
            }

            const { data, error } = await updateQuery.select();
            if (error) throw error;
            
            performSmartRevalidation(table, payload, matchConfig);

            // Mijozga Telegram orqali xabar yuborish (Buyurtma holati o'zgarganda)
            if (table === "orders" && payload.status) {
                let orderIdToNotify = null;
                if (matchConfig && matchConfig.column === 'id') {
                    orderIdToNotify = matchConfig.value;
                } else if (data && data.length > 0) {
                    orderIdToNotify = data[0].id;
                }
                
                if (orderIdToNotify) {
                    sendOrderStatusNotification(orderIdToNotify, payload.status);
                }
            }
            
            return NextResponse.json({ success: true, data });
        }
        else if (action === "upsert") {
            let upsertQuery = query.upsert(payload, onConflict ? { onConflict } : undefined);
            const { data, error } = await upsertQuery.select();
            if (error) throw error;
            
            performSmartRevalidation(table, payload, matchConfig);
            
            return NextResponse.json({ success: true, data });
        }
        else if (action === "delete") {
            if (!matchConfig && !inConfig) return NextResponse.json({ error: "Match config required for delete" }, { status: 400 });
            
            let deleteQuery: any = query.delete();
            if (matchConfig) {
                deleteQuery = deleteQuery.eq(matchConfig.column, matchConfig.value);
            }
            if (inConfig) {
                deleteQuery = deleteQuery.in(inConfig.column, inConfig.values);
            }

            const { data, error } = await deleteQuery;
            if (error) throw error;
            
            performSmartRevalidation(table, payload, matchConfig);
            
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error(`Admin CRUD POST error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
