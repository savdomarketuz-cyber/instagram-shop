import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get("phone");
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!userPhone) {
        return NextResponse.json({ success: false, message: "Missing phone" }, { status: 400 });
    }

    try {
        if (!checkRateLimit(ip, 10, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish." }, { status: 429 });
        }

        const { data, error } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("user_phone", userPhone)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, message: "Orders not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, orders: data });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
