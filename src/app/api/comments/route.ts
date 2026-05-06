import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { verifyJwt } from "@/lib/jwt-utils";

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        if (!checkRateLimit(ip, 5, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish." }, { status: 429 });
        }

        const { action, p_user_phone, p_comment_id, p_comment_data } = await req.json();

        if (!action || !p_user_phone) {
            return NextResponse.json({ success: false, message: "Ma'lumotlar yetarli emas." }, { status: 400 });
        }

        // 🛡 SECURITY: Verify JWT Token
        const token = req.cookies.get("user_token")?.value;
        const adminToken = req.cookies.get("admin_token")?.value;
        
        const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback_secret_key_123!";
        const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() || "default-secret";

        let authPayload = null;
        if (adminToken) {
            authPayload = await verifyJwt(adminToken, ADMIN_SECRET);
            // Admin can act on behalf of any user phone (for moderation) or their own
        } else if (token) {
            authPayload = await verifyJwt(token, JWT_SECRET);
            if (!authPayload || authPayload.sub !== p_user_phone) {
                return NextResponse.json({ success: false, message: "Sessiya xatosi. Iltimos qayta kiring." }, { status: 401 });
            }
        }

        if (!authPayload) {
            return NextResponse.json({ success: false, message: "Sharh qoldirish uchun tizimga kiring." }, { status: 401 });
        }

        // 🛡 ACTION: ADD COMMENT
        if (action === 'insert') {
            const { product_id, text, type, rating, parent_id } = p_comment_data;

            // 1. MUST HAVE PURCHASED TO REVIEW
            if (type === 'review' && !parent_id) {
                const { data: orders } = await supabaseAdmin
                    .from("orders")
                    .select("items")
                    .eq("user_phone", p_user_phone);

                const hasPurchased = orders?.some(order => 
                    order.items?.some((item: any) => item.id === product_id)
                );

                if (!hasPurchased) {
                    return NextResponse.json({ success: false, message: "Sharh qoldirish uchun ushbu mahsulotni sotib olgan bo'lishingiz kerak." }, { status: 403 });
                }
            }

            // 2. Insert Comment
            const { data, error } = await supabaseAdmin.from("comments").insert([{
                ...p_comment_data,
                user_id: p_user_phone, // We use phone as identity for now
                created_at: new Date().toISOString()
            }]);

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // 🛡 ACTION: UPDATE / DELETE
        if (action === 'update' || action === 'delete' || action === 'react') {
            // 1. Ownership Check
            const { data: comment } = await supabaseAdmin
                .from("comments")
                .select("user_id, is_admin")
                .eq("id", p_comment_id)
                .single();

            if (!comment) return NextResponse.json({ success: false, message: "Sharh topilmadi." }, { status: 404 });
            
            // Allow update/delete if it's the owner or if an admin (check phone)
            // Note: In real app, verify admin status properly
            const isOwner = comment.user_id === p_user_phone;
            if (!isOwner && action !== 'react') {
                return NextResponse.json({ success: false, message: "Ruxsat etilmadi." }, { status: 403 });
            }

            if (action === 'delete') {
                await supabaseAdmin.from("comments").delete().eq("id", p_comment_id);
            } else if (action === 'update') {
                await supabaseAdmin.from("comments").update({ 
                    text: p_comment_data.text, 
                    is_edited: true,
                    updated_at: new Date().toISOString() 
                }).eq("id", p_comment_id);
            } else if (action === 'react') {
                await supabaseAdmin.from("comments").update({ 
                    reactions: p_comment_data.reactions 
                }).eq("id", p_comment_id);
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, message: "Noto'g'ri amal." }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
