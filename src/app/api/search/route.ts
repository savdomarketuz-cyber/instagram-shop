import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(req: NextRequest) {
    try {
        const { query, image, imageUrl } = await req.json();

        let searchBlob = query || "";

        const searchQuery = query || "";
        if (!searchQuery.trim()) {
            return NextResponse.json({ results: [] });
        }

        console.log(`Algorithmic Search: ${searchQuery}`);

        // 1. Keyword Search (Strict Algorithm)
        // Ensure we search across all language fields name_uz/name_ru/desc/tags
        const searchPattern = `%${searchQuery.trim()}%`;
        const words = searchQuery.trim().split(/\s+/).filter((w: string) => w.length > 1);
        
        let keywordQuery = supabase
            .from('products')
            .select('*')
            .eq('is_deleted', false);

        // Build a robust OR filter for multi-language and SEO
        // This is pure algorithmic SQL matching
        let orFilter = `name_uz.ilike.${searchPattern},name_ru.ilike.${searchPattern},description_uz.ilike.${searchPattern},description_ru.ilike.${searchPattern},category_uz.ilike.${searchPattern},category_ru.ilike.${searchPattern},article.ilike.${searchPattern},sku.ilike.${searchPattern}`;
        
        // Add individual word matching for better 'Google-like' results without AI
        if (words.length > 1) {
            words.forEach((word: string) => {
                const wordPattern = `%${word}%`;
                orFilter += `,name_uz.ilike.${wordPattern},name_ru.ilike.${wordPattern}`;
            });
        }

        keywordQuery = keywordQuery.or(orFilter);

        const { data: results, error } = await keywordQuery.order('sales', { ascending: false }).limit(50);
        
        if (error) throw error;

        return NextResponse.json({ 
            success: true, 
            results: results || [],
            count: (results || []).length
        });

    } catch (error: any) {
        console.error("Advanced Search failed:", error);
        return NextResponse.json({ error: "Search failed: " + error.message }, { status: 500 });
    }
}
