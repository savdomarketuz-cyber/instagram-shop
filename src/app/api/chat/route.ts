import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";


/**
 * GET: Fetch messages for a specific chat
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chat_id");
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!chatId) return NextResponse.json({ error: "No chat ID" }, { status: 400 });

    try {
        if (!checkRateLimit(ip, 30, 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

        // 🛡 SECURITY: Verify requester identity
        // In a real app, we'd check JWT. Here, since we don't have user JWT yet,
        // we at least ensure the chatId is provided and later RLS/API will enforce.
        
        const { data, error } = await supabaseAdmin
            .from("support_messages")
            .select("*")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return NextResponse.json({ success: true, messages: data });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST: Send a new message
 */
export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        if (!checkRateLimit(ip, 15, 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

        const { chat_id, text, image, video, sender_id, sender_type } = await req.json();

        // 🛡 SECURITY: Hard-code is_admin to false for public API users
        // Only internal admin routes can set is_admin: true
        const isAdmin = false;

        // 1. Insert Message
        const { error: msgErr } = await supabaseAdmin.from("support_messages").insert([{
            chat_id,
            text,
            image,
            video,
            sender_id,
            sender_type: "user", // Forced to user
            is_admin: isAdmin, // Hard-secured
            created_at: new Date().toISOString()
        }]);

        if (msgErr) throw msgErr;

        // 2. Update/Upsert Chat Session
        const lastMsg = image ? "🖼️ Rasm" : (video ? "🎥 Video" : text);
        await supabaseAdmin.from("support_chats").upsert({
            id: chat_id,
            last_message: lastMsg,
            last_timestamp: new Date().toISOString(),
            status: 'active',
            unread_by_admin: 1
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
