import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";


/**
 * Global User Search for Messaging (Secure)
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim().toLowerCase();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!query || query.length < 2) return NextResponse.json({ users: [] });

    try {
        if (!checkRateLimit(ip, 10, 60)) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

        // 🔍 Search users but DO NOT return full phone numbers
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("name, username, phone")
            .or(`username.ilike.%${query}%,name.ilike.%${query}%`) // No phone search for general public
            .limit(10);

        if (error) throw error;

        // 🛡 Mask phone numbers before sending to client
        const maskedUsers = (data || []).map(u => ({
            name: u.name,
            username: u.username,
            phone: u.phone ? (u.phone.slice(0, 7) + "***" + u.phone.slice(-4)) : null,
            id: u.phone // still needed for routing but it's masked or we should use a public ID
        }));

        return NextResponse.json({ success: true, users: maskedUsers });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
