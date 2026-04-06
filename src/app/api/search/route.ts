import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapProduct } from '@/lib/mappers';

export async function POST(req: NextRequest) {
    try {
        const { query, image } = await req.json();

        // 1. Handle Visual Search (if image is provided)
        if (image && !query) {
            // For now, visual search returns empty or could be expanded with AI
            // But we must not return early with error if image is present
            console.log("Visual Search requested");
            // If there's an image but no query, we might want to return some 'related' items 
            // or just an empty list until full AI integration is back.
            // For now, let's allow it to proceed or return empty gracefully.
            return NextResponse.json({ success: true, results: [], count: 0 });
        }

        const searchQuery = (query || "").trim();
        if (!searchQuery) {
            return NextResponse.json({ results: [] });
        }

        console.log(`Algorithmic Search: ${searchQuery}`);

        // 2. Keyword Search (Strict Algorithm)
        const searchPattern = `%${searchQuery}%`;
        const words = searchQuery.split(/\s+/).filter((w: string) => w.length > 1);
        
        // Build a robust OR filter for multi-language and SEO
        // This is pure algorithmic SQL matching across ALL relevant columns
        let orFilter = [
            `name.ilike.${searchPattern}`,
            `name_uz.ilike.${searchPattern}`,
            `name_ru.ilike.${searchPattern}`,
            `description.ilike.${searchPattern}`,
            `description_uz.ilike.${searchPattern}`,
            `description_ru.ilike.${searchPattern}`,
            `category_uz.ilike.${searchPattern}`,
            `category_ru.ilike.${searchPattern}`,
            `article.ilike.${searchPattern}`,
            `sku.ilike.${searchPattern}`,
            `tag.ilike.${searchPattern}`
        ].join(',');
        
        // Add individual word matching for better 'Google-like' results
        if (words.length > 1) {
            words.forEach((word: string) => {
                const wordPattern = `%${word}%`;
                orFilter += `,name.ilike.${wordPattern},name_uz.ilike.${wordPattern},name_ru.ilike.${wordPattern}`;
            });
        }

        const { data: results, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_deleted', false)
            .or(orFilter)
            .order('sales', { ascending: false })
            .limit(50);
        
        if (error) {
            console.error("Supabase search error:", error);
            throw error;
        }

        // Map results consistently with the rest of the app
        const mappedResults = (results || []).map(mapProduct);

        return NextResponse.json({ 
            success: true, 
            results: mappedResults,
            count: mappedResults.length
        });

    } catch (error: any) {
        console.error("Advanced Search failed:", error);
        return NextResponse.json({ error: "Search failed: " + error.message, results: [] }, { status: 500 });
    }
}
