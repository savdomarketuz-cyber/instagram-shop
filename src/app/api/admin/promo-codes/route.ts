import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("promo_codes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const promo = await req.json();
        const { id, ...promoData } = promo;

        if (id) {
            // Update
            const { error } = await supabaseAdmin
                .from("promo_codes")
                .update({ ...promoData, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        } else {
            // Create
            const { error } = await supabaseAdmin
                .from("promo_codes")
                .insert(promoData);
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        const { error } = await supabaseAdmin
            .from("promo_codes")
            .delete()
            .eq("id", id);
        
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
