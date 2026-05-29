import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";

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
        const { data, error } = await supabaseAdmin
            .from("orders")
            .select("id, user_phone, total, status, items, address, coords, created_at, smart_discount_amount, promo_code, discount_amount, wallet_amount")
            .order("created_at", { ascending: false })
            .limit(500);
        if (error) throw error;
        return NextResponse.json({ success: true, orders: data || [] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
