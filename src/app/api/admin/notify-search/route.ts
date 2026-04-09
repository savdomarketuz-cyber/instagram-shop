import { NextRequest, NextResponse } from "next/server";
import { submitToIndexNow } from "@/lib/index-now";
import { getProductSlug } from "@/lib/slugify";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { mapProduct } from "@/lib/mappers";

/**
 * API to notify search engines about new or updated products.
 * Supports single ID or array of IDs.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { productId, productIds } = body;
        
        const idsToNotify: string[] = [];
        if (productId) idsToNotify.push(productId);
        if (productIds && Array.isArray(productIds)) idsToNotify.push(...productIds);

        if (idsToNotify.length === 0) {
            return NextResponse.json({ error: "No product IDs provided" }, { status: 400 });
        }

        // Fetch products to get slugs (max 1000 for safety)
        const { data: productsData, error } = await supabaseAdmin
            .from("products")
            .select("*")
            .in("id", idsToNotify.slice(0, 1000));

        if (error) throw error;
        if (!productsData || productsData.length === 0) {
            return NextResponse.json({ error: "No products found for given IDs" }, { status: 404 });
        }
        
        const urls: string[] = [];
        productsData.forEach(pData => {
            const product = mapProduct(pData);
            const slug = getProductSlug(product);
            urls.push(`https://velari.uz/uz/products/${slug}`);
            urls.push(`https://velari.uz/ru/products/${slug}`);
        });

        // Submit to IndexNow
        const success = await submitToIndexNow(urls);

        // TODO: Integrate Google Indexing API here once credentials are set up

        return NextResponse.json({ 
            success, 
            count: urls.length,
            submittedUrls: urls.length > 10 ? `${urls.length} URLs` : urls 
        });
    } catch (error: any) {
        console.error("Notify Search API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
