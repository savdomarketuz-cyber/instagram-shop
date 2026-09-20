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
    const isSuggested = searchParams.get("suggested") === "true";
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!isSuggested && (!query || query.length < 2)) {
        return NextResponse.json({ success: true, users: [] });
    }

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
        if (!await checkRateLimit(ip, 20, 60)) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

        let data: any[] = [];
        if (isSuggested) {
            // 👥 Return active users for discovery (Meta/Instagram Direct style)
            const { data: usersData, error } = await supabaseAdmin
                .from("users")
                .select("name, username, phone, created_at")
                .neq("phone", payload.sub)
                .not("name", "is", null)
                .order("created_at", { ascending: false })
                .limit(15);

            if (error) throw error;
            data = usersData || [];
        } else {
            // 🔍 Search users by username or name only (no raw phone search)
            const { data: usersData, error } = await supabaseAdmin
                .from("users")
                .select("name, username, phone")
                .neq("phone", payload.sub)
                .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;
            data = usersData || [];
        }

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

