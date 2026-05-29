import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
    try {
        const { type, payload } = await req.json();

        if (type === "cart") {
            const { user_phone, items } = payload;
            if (!user_phone) return NextResponse.json({ error: "Missing user_phone" }, { status: 400 });
            
            if (!items || items.length === 0) {
                await supabaseAdmin.from("active_carts").delete().eq("user_phone", user_phone);
            } else {
                await supabaseAdmin.from("active_carts").upsert({
                    user_phone,
                    items,
                    updated_at: new Date().toISOString()
                }, { onConflict: "user_phone" });
            }
        } else if (type === "status") {
            const { id, is_online, updated_at } = payload;
            if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
            
            await supabaseAdmin.from("user_status").upsert({
                id,
                is_online,
                updated_at: updated_at || new Date().toISOString()
            }, { onConflict: "id" });
        } else if (type === "status_update") {
            const { id, is_online, updated_at } = payload;
            if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
            
            await supabaseAdmin.from("user_status").update({
                is_online,
                updated_at: updated_at || new Date().toISOString()
            }).eq("id", id);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Client sync error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
