import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapProduct } from '@/lib/mappers';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(req: NextRequest) {
    try {
        const { query, image, suggest } = await req.json();

        // 1. Handle Visual Search (if image is provided)
        if (image && !query) {
            console.log("Visual Search requested");
            return NextResponse.json({ success: true, results: [], count: 0 });
        }

        const searchQuery = (query || "").trim();
        if (!searchQuery) {
            return NextResponse.json({ results: [] });
        }

        // 2. Compute Embedding for Semantic Search (Fail-safe)
        let queryEmbedding = null;
        if (!suggest) {
            console.log(`Smart Search Executing: ${searchQuery}`);
            try {
                queryEmbedding = await generateEmbedding(searchQuery);
            } catch(e) {
                console.warn("Embedding generation failed, falling back to pure text search:", e);
            }
        } else {
            console.log(`Live Suggestion Search Executing: ${searchQuery}`);
        }

        // 3. Call Advanced Smart Search RPC (Fuzzy + Weighted + Semantic)
        const { data: results, error } = await supabase.rpc('advanced_smart_search', {
            search_query: searchQuery,
            query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
            match_threshold: 0.25, // allow slightly broader semantic matches
            match_count: suggest ? 5 : 50
        });
        
        if (error) {
            console.error("Supabase RPC search error:", error);
            throw error;
        }

        // Map results consistently with the rest of the app
        const mappedResults = (results || []).map(mapProduct);

        // 4. Record Search Analytics (Non-blocking)
        supabase.from('search_analytics').insert({
            query: searchQuery,
            results_count: mappedResults.length
        }).then(({ error }) => {
            if (error) console.error("Search analytics logging failed:", error);
        });

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

