import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";
import crypto from "crypto";

async function getUserFromToken(req: NextRequest) {
    const token = req.cookies.get("user_token")?.value;
    if (!token) return null;
    const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback_secret_key_123!";
    const payload = await verifyJwt(token, JWT_SECRET);
    return payload?.sub; // phone
}

export async function GET(req: NextRequest) {
    const phone = await getUserFromToken(req);
    if (!phone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { data: user } = await supabaseAdmin.from("users").select("id").eq("phone", phone).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { data, error } = await supabaseAdmin
            .from("affiliate_referral_links")
            .select("*, products(name)")
            .eq("affiliate_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const phone = await getUserFromToken(req);
    if (!phone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { productId } = await req.json();
        if (!productId) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

        const { data: user } = await supabaseAdmin.from("users").select("id, affiliate_code").eq("phone", phone).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Generate a unique slug
        const randomStr = crypto.randomBytes(3).toString('hex');
        const slug = `${user.affiliate_code}-${randomStr}`;

        const { data, error } = await supabaseAdmin
            .from("affiliate_referral_links")
            .insert({
                affiliate_id: user.id,
                product_id: productId,
                slug
            })
            .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data: data[0] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
