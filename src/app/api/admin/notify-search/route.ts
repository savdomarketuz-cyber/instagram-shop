import { NextRequest, NextResponse } from "next/server";
import { submitToIndexNow } from "@/lib/index-now";
import { getProductSlug } from "@/lib/slugify";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { mapProduct } from "@/lib/mappers";

export async function POST(req: NextRequest) {
    try {
        const { productId } = await req.json();
        if (!productId) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

        // Fetch product to get slugs
        const { data: productData } = await supabaseAdmin
            .from("products")
            .select("*")
            .eq("id", productId)
            .single();

        if (!productData) return NextResponse.json({ error: "Product not found" }, { status: 404 });
        
        const product = mapProduct(productData);
        const slug = getProductSlug(product);

        const urls = [
            `https://velari.uz/uz/products/${slug}`,
            `https://velari.uz/ru/products/${slug}`
        ];

        const success = await submitToIndexNow(urls);

        return NextResponse.json({ success, urls });
    } catch (error: any) {
        console.error("Notify Search API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
