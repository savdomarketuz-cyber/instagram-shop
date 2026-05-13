import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";

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
        const { userPhone, ban } = await req.json();

        if (!userPhone) {
            return NextResponse.json({ error: "Missing user phone" }, { status: 400 });
        }

        // We use a future date (e.g. 2099) for a permanent ban, or NULL to unban.
        const banned_until = ban ? '2099-01-01T00:00:00.000Z' : null;

        const { error } = await supabaseAdmin
            .from("users")
            .update({ banned_until })
            .eq("phone", userPhone);

        if (error) throw error;

        return NextResponse.json({ success: true, banned_until });
    } catch (e: any) {
        console.error("Ban user error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
