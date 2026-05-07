import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";
import { sendCartReminder } from "@/lib/telegram";

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
        // Fetch active carts that have items in them
        const { data: carts, error } = await supabaseAdmin
            .from("active_carts")
            .select(`
                user_phone,
                items,
                updated_at,
                users ( name, telegram_id )
            `)
            .order("updated_at", { ascending: false });

        if (error) throw error;

        // Filter carts that actually have items
        const validCarts = carts?.filter(cart => 
            cart.items && 
            Array.isArray(cart.items) && 
            cart.items.length > 0 && 
            cart.user_phone !== "anonymous"
        ) || [];

        return NextResponse.json({ success: true, carts: validCarts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { phone, items } = await req.json();
        
        if (!phone || !items || items.length === 0) {
            return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
        }

        const result = await sendCartReminder(phone, items);
        
        if (!result?.success) {
            return NextResponse.json({ error: result?.error || "Xatolik yuz berdi" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "Eslatma yuborildi" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
