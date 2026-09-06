import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
    try {
        const { subscription, userPhone, platform } = await req.json();

        if (!subscription) {
            return NextResponse.json({ error: "Obuna ma'lumotlari yo'q" }, { status: 400 });
        }

        const tokenStr = JSON.stringify(subscription);
        const targetPhone = userPhone?.trim() || 'anonymous';

        const { error } = await supabaseAdmin
            .from("fcm_tokens")
            .upsert({
                user_phone: targetPhone,
                token: tokenStr,
                platform: platform || 'web',
                last_updated: new Date().toISOString()
            }, { onConflict: 'user_phone' });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Push subscription error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
