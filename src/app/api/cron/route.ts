import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Muddati o'tgan buyurtmalarni tozalash
        const { error } = await supabaseAdmin.rpc('restore_expired_orders');
        if (error) throw error;
        
        return NextResponse.json({ 
            success: true, 
            message: "Expired orders cleaned up"
        });
    } catch(e: any) {
        console.error("Cron Error: ", e);
        return NextResponse.json({ success: false, error: e.message });
    }
}
