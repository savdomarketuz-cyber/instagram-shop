import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyJwt } from "@/lib/jwt-utils";
import webpush from "web-push";

// VAPID sozlamalari POST funksiyasi ichiga ko'chirildi

async function verifyAdmin(req: NextRequest) {
    const adminToken = req.cookies.get("admin_token")?.value;
    const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim();
    if (!ADMIN_SECRET || !adminToken) return false;
    const payload = await verifyJwt(adminToken, ADMIN_SECRET);
    return payload && payload.role === "admin";
}

export async function POST(req: NextRequest) {
    if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BDjNKYY_cp8NDYQsowXfhIlfikWZmhCDTvFJOWubcNwvOW-LPnBH70sITFARnWBxHOOF-xuT3d3kuy9lkwzQKs8";
    const privKey = process.env.VAPID_PRIVATE_KEY || "VFjEhX16DW3x3g8NyNIdbg9M_WJQgMPopMjTP9vKdew";

    if (!pubKey || !privKey) {
        return NextResponse.json({ error: "VAPID kalitlari o'rnatilmagan (Server xatosi)" }, { status: 500 });
    }

    try {
        webpush.setVapidDetails("mailto:admin@velari.uz", pubKey, privKey);
        
        const { title, body, url } = await req.json();

        if (!title || !body) {
            return NextResponse.json({ error: "Sarlavha va matn kerak" }, { status: 400 });
        }

        // Barcha obunalarni bazadan olamiz
        const { data: subscriptions, error } = await supabaseAdmin
            .from("fcm_tokens")
            .select("token, user_phone");

        if (error) throw error;

        const results = {
            success: 0,
            failed: 0
        };

        const pushPayload = JSON.stringify({ title, body, url: url || '/' });

        // Har bir obunachiga xabar jo'natamiz
        const pushPromises = (subscriptions || []).map(async (subRow) => {
            try {
                const subscription = JSON.parse(subRow.token);
                if (!subscription || !subscription.endpoint) return;
                await webpush.sendNotification(subscription, pushPayload);
                results.success++;
            } catch (error: any) {
                console.error("Push yuborishda xato (phone: " + subRow.user_phone + "):", error);
                results.failed++;
                if (error?.statusCode === 410 || error?.statusCode === 404) {
                    await supabaseAdmin.from("fcm_tokens").delete().eq("token", subRow.token);
                }
            }
        });

        await Promise.all(pushPromises);

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Push send error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
