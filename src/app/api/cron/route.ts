import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
    try {
        const { error } = await supabaseAdmin.rpc('restore_expired_orders');
        if (error) throw error;
        
        return NextResponse.json({ success: true, message: "Expired orders cleaned up" });
    } catch(e: any) {
        console.error("Cron Error: ", e);
        return NextResponse.json({ success: false, error: e.message });
    }
}
