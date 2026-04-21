import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const userPhone = searchParams.get("phone");

    if (!orderId || !userPhone) {
        return NextResponse.json({ success: false, message: "Missing orderId or phone" }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .eq("user_phone", userPhone)
            .single();

        if (error || !data) {
            return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, order: data });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
