import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { verifyJwt } from "@/lib/jwt-utils";

/**
 * Global User Search for Messaging (Secure)
 * Authenticated-only to prevent anonymous scraping of customer database.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim().toLowerCase();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!query || query.length < 2) return NextResponse.json({ users: [] });

    // 🛡 1. Require Authenticated User Session (Blocks anonymous scrapers)
    const token = req.cookies.get("user_token")?.value;
    if (!token) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback_secret_key_123!";
    const payload = await verifyJwt(token, JWT_SECRET);
    if (!payload || !payload.sub) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!await checkRateLimit(ip, 10, 60)) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

        // 🔍 Search users by username or name only (no raw phone search)
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("name, username, phone")
            .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;

        // 🛡 Mask phone numbers and phone-like usernames before sending to client
        const maskedUsers = (data || []).map(u => {
            const isPhoneUsername = u.username && /^\+?[0-9]{9,15}$/.test(u.username);
            const maskedPhone = u.phone ? (u.phone.slice(0, 7) + "***" + u.phone.slice(-4)) : null;
            return {
                name: u.name,
                username: isPhoneUsername ? (u.username.slice(0, 7) + "***" + u.username.slice(-4)) : u.username,
                phone: maskedPhone,
                id: u.phone // Safe for authenticated user chat routing
            };
        });

        return NextResponse.json({ success: true, users: maskedUsers });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

