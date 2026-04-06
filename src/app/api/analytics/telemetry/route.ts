import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventType, productId, categoryId, eventValue, metadata } = body;

        // 1. Identify User (Phone if logged in, otherwise Session Cookie or IP as fallback fallback)
        const userPhoneCookie = req.cookies.get('user_phone')?.value;
        const fallbackSession = req.headers.get('x-forwarded-for') || req.ip || 'anonymous_session';
        const userIdentifier = userPhoneCookie || fallbackSession;

        if (!eventType) {
             return NextResponse.json({ error: "Missing event type" }, { status: 400 });
        }

        // 2. Insert into Telemetry Logs (for future AI CRON job crunching)
        const { error: insertError } = await supabase.from('user_telemetry_logs').insert([{
            user_identifier: userIdentifier,
            event_type: eventType,
            product_id: productId || null,
            category_id: categoryId || null,
            event_value: eventValue || null,
            event_metadata: metadata || {}
        }]);

        if (insertError) {
             console.error("Telemetry Logging Error:", insertError);
             return NextResponse.json({ error: "Failed to log" }, { status: 500 });
        }

        // 3. Immediately increment Objective Data on Products table if needed
        // This is the "1st Layer" global product score
        if (eventType === 'PRODUCT_VIEW' && productId) {
             // Let's use RPC for an atomic increment instead of select+update
             // We'll just call increment_product_views
             const { error: rpcError } = await supabase.rpc('increment_product_views', { p_id: productId });
             if (rpcError) console.error("Increment error:", rpcError); // silent fail for client
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Telemetry Error" }, { status: 500 });
    }
}
