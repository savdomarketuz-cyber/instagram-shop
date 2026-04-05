import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GROQ_API_KEYS = [
    process.env.GROQ_API_KEY_1 || "",
    process.env.GROQ_API_KEY_2 || ""
].filter(key => key !== "");

let currentKeyIndex = 0;

async function analyzeVisionImg(imageUrl: string, productName: string) {
    const apiKey = GROQ_API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: `Ushbu mahsulot rasmi uchun Google qidiruv tizimida (SEO) eng yuqori natija beradigan, qisqa va tushunarli muqobil matn (alt text) yozing. JAVOB FAQAT JSON BO'LSIN: { "uz": "...", "ru": "..." }. Mahsulot nomi: ${productName}` },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            }),
        });

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        return content ? JSON.parse(content) : null;
    } catch (err) {
        console.error("Vision AI Error for link:", imageUrl, err);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { productId } = await req.json();
        if (!productId) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

        // 1. Fetch Product
        const { data: product, error } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .single();

        if (error || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const allImages = Array.from(new Set([
            product.image,
            ...(product.images || [])
        ])).filter(Boolean) as string[];

        const currentMeta = product.image_metadata || {};
        const newMeta = { ...currentMeta };
        let updatedCount = 0;

        // 2. Loop through missing ones
        for (const url of allImages) {
            if (newMeta[url]) continue; // Already exists

            console.log("Analyzing image:", url);
            const res = await analyzeVisionImg(url, product.name_uz || product.name);
            if (res) {
                newMeta[url] = {
                    alt_uz: res.uz || res.alt_uz,
                    alt_ru: res.ru || res.alt_ru
                };
                updatedCount++;
            }
        }

        // 3. Update Product if changed
        if (updatedCount > 0) {
            await supabase
                .from("products")
                .update({ image_metadata: newMeta })
                .eq("id", productId);
        }

        return NextResponse.json({ 
            success: true, 
            updated: updatedCount, 
            total: allImages.length 
        });

    } catch (error) {
        console.error("Auto Vision Worker failed:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
