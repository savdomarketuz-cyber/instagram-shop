import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";
import { revalidatePath } from "next/cache";
import { sendOrderStatusNotification } from "@/lib/telegram";

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
        const { table, action, payload, matchConfig, inConfig } = await req.json();

        if (!table) return NextResponse.json({ error: "Table is required" }, { status: 400 });

        let query = supabaseAdmin.from(table);

        if (action === "insert") {
            const { data, error } = await query.insert(payload).select();
            if (error) throw error;
            
            if (table === "products" || table === "banners" || table === "categories") {
                revalidatePath("/", "layout");
                revalidatePath("/uz", "layout");
                revalidatePath("/ru", "layout");
            }
            
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
            
            if (table === "products" || table === "banners" || table === "categories") {
                revalidatePath("/", "layout");
                revalidatePath("/uz", "layout");
                revalidatePath("/ru", "layout");
            }

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
            const { data, error } = await query.upsert(payload).select();
            if (error) throw error;
            
            if (table === "products" || table === "banners" || table === "categories") {
                revalidatePath("/", "layout");
                revalidatePath("/uz", "layout");
                revalidatePath("/ru", "layout");
            }
            
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
            
            if (table === "products" || table === "banners" || table === "categories") {
                revalidatePath("/", "layout");
                revalidatePath("/uz", "layout");
                revalidatePath("/ru", "layout");
            }
            
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error(`Admin CRUD POST error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
