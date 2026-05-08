import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";

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

        // Get my active promo codes
        const { data: myCodes } = await supabaseAdmin
            .from("affiliate_promo_codes")
            .select("*, promo_code_tariffs(*)")
            .eq("affiliate_id", user.id);

        // Get available tariffs
        const { data: tariffs } = await supabaseAdmin
            .from("promo_code_tariffs")
            .select("*")
            .eq("is_active", true);

        return NextResponse.json({ success: true, myCodes, tariffs });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const phone = await getUserFromToken(req);
    if (!phone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { tariffId, customCode } = await req.json();
        if (!tariffId || !customCode) return NextResponse.json({ error: "Tariff and Code required" }, { status: 400 });

        const { data: user } = await supabaseAdmin.from("users").select("id").eq("phone", phone).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Check if code is already taken
        const { data: existing } = await supabaseAdmin
            .from("affiliate_promo_codes")
            .select("id")
            .eq("code", customCode.toUpperCase())
            .single();

        if (existing) return NextResponse.json({ error: "Bu promo-kod band" }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from("affiliate_promo_codes")
            .insert({
                affiliate_id: user.id,
                tariff_id: tariffId,
                code: customCode.toUpperCase()
            })
            .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data: data[0] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
