import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const { productId, query } = await req.json();

        if (!productId || !query || query.trim().length < 2) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const { error } = await supabase.rpc('log_search_click', {
            p_product_id: productId,
            p_query: query.trim()
        });

        if (error) {
            console.error("Auto-tagging logging error:", error);
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
