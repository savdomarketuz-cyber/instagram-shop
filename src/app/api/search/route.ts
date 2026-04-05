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

        console.log(`Hybrid Search: ${searchQuery}`);

        // 1. Vector Search (AI Boost)
        let vectorResults = [];
        try {
            const embedding = await generateEmbedding(searchQuery);
            const { data: vHits } = await supabase.rpc('match_products', {
                query_embedding: embedding,
                match_threshold: 0.2, // slightly stricter
                match_count: 20
            });
            vectorResults = vHits || [];
        } catch (vErr) {
            console.error("Vector search sub-step failed", vErr);
        }

        // 2. Keyword Search (Legacy/Multi-language fallback)
        // Ensure we search across all language fields name_uz/name_ru/desc/tags
        const terms = searchQuery.split(' ').filter((t: string) => t.length > 2);
        const searchPattern = `%${searchQuery.trim()}%`;
        
        let keywordQuery = supabase
            .from('products')
            .select('*')
            .eq('is_deleted', false);

        // Build a robust OR filter for multi-language and SEO
        keywordQuery = keywordQuery.or(`name_uz.ilike.${searchPattern},name_ru.ilike.${searchPattern},description_uz.ilike.${searchPattern},description_ru.ilike.${searchPattern},category_uz.ilike.${searchPattern},category_ru.ilike.${searchPattern},article.ilike.${searchPattern},sku.ilike.${searchPattern}`);

        const { data: keywordHits } = await keywordQuery.limit(50);
        
        // 3. Combine and De-duplicate
        const combined = [...vectorResults, ...(keywordHits || [])];
        const uniqueByIdContext: Record<string, any> = {};
        combined.forEach(p => {
            if (!uniqueByIdContext[p.id]) uniqueByIdContext[p.id] = p;
        });

        const results = Object.values(uniqueByIdContext);

        return NextResponse.json({ 
            success: true, 
            results,
            count: results.length
        });

    } catch (error: any) {
        console.error("Advanced Search failed:", error);
        return NextResponse.json({ error: "Search failed: " + error.message }, { status: 500 });
    }
}
