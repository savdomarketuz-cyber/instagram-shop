import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const { subscription, userPhone, platform } = await req.json();

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ error: "Obuna ma'lumotlari yo'q" }, { status: 400 });
        }

        const tokenStr = JSON.stringify(subscription);
        const targetPhone = userPhone?.trim() || 'anonymous';

        // 1. Foydalanuvchi users jadvalida borligini tekshiramiz (fcm_tokens foreign key talabi uchun)
        const { data: existingUser } = await supabaseAdmin
            .from("users")
            .select("phone")
            .eq("phone", targetPhone)
            .maybeSingle();

        if (!existingUser) {
            await supabaseAdmin.from("users").insert([{
                id: crypto.randomUUID(),
                phone: targetPhone,
                password: 'placeholder_push_auth_' + crypto.randomBytes(8).toString('hex'),
                name: targetPhone === 'anonymous' ? 'Mehmon' : 'Foydalanuvchi',
                is_admin: false,
                created_at: new Date().toISOString()
            }]);
        }

        // 2. Tokenni fcm_tokens jadvaliga saqlaymiz
        const { error } = await supabaseAdmin
            .from("fcm_tokens")
            .upsert({
                user_phone: targetPhone,
                token: tokenStr,
                platform: platform || 'web',
                last_updated: new Date().toISOString()
            }, { onConflict: 'user_phone' });

        if (error) {
            console.error("fcm_tokens upsert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Push subscription error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
