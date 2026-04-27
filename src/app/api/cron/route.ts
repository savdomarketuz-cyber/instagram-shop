import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pingSitemapToGoogle } from "@/lib/google-indexing";

export async function GET(req: Request) {
    try {
        // 1. Muddati o'tgan buyurtmalarni tozalash
        const { error } = await supabaseAdmin.rpc('restore_expired_orders');
        if (error) throw error;
        
        // 2. Google sitemap ping — har kuni xabar berish
        const sitemapPinged = await pingSitemapToGoogle();
        
        return NextResponse.json({ 
            success: true, 
            message: "Expired orders cleaned up",
            sitemapPinged
        });
    } catch(e: any) {
        console.error("Cron Error: ", e);
        return NextResponse.json({ success: false, error: e.message });
    }
}
