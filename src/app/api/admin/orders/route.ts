import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminFresh } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";

export const dynamic = 'force-dynamic';

/**
 * Admin — buyurtmalar ro'yxati (service-role).
 *
 * `orders` jadvalida RLS yoqilgan, lekin policy yo'q — shuning uchun client (anon)
 * hech narsa o'qiy olmaydi. Admin panel buyurtmalarni shu endpoint orqali oladi.
 */

async function verifyAdmin(req: NextRequest) {
    const adminToken = req.cookies.get("admin_token")?.value;
    const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim();
    if (!ADMIN_SECRET || !adminToken) return false;
    const payload = await verifyJwt(adminToken, ADMIN_SECRET);
    return payload && payload.role === "admin";
}

export async function GET(req: NextRequest) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { data, error } = await supabaseAdminFresh
            .from("orders")
            .select("id, user_phone, total, status, items, address, coords, created_at, smart_discount_amount, promo_code, discount_amount, wallet_amount, delivery_fee, delivery_type")
            .order("created_at", { ascending: false })
            .limit(500);
        if (error) throw error;
        // Kesh yo'q — admin har doim eng so'nggi holatni ko'rishi shart (status o'zgarishi).
        return NextResponse.json(
            { success: true, orders: data || [] },
            { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
        );
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
