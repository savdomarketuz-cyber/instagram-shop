import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapProduct } from '@/lib/mappers';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(req: NextRequest) {
    try {
        const { query, image, suggest, userPhone } = await req.json();

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
            match_threshold: 0.15, // lowered from 0.25 to catch broader Uzbek semantics
            match_count: suggest ? 5 : 50
        });
        
        if (error) {
            console.error("Supabase RPC search error:", error);
            throw error;
        }

        // Map results consistently with the rest of the app
        let mappedResults = (results || []).map(mapProduct);

        // 3.5 Personalization logic
        if (userPhone && mappedResults.length > 0 && !suggest) {
            const { data: interests } = await supabase
                .from('user_interests')
                .select('categories')
                .eq('user_phone', userPhone)
                .single();
                
            if (interests && interests.categories) {
                const catWeights = interests.categories as Record<string, number>;
                // Sort by injecting a personal score
                mappedResults = mappedResults.sort((a: any, b: any) => {
                    const aCat = a.category || a.category_id || a.category_uz || "";
                    const bCat = b.category || b.category_id || b.category_uz || "";
                    const aScore = catWeights[aCat] || 0;
                    const bScore = catWeights[bCat] || 0;
                    // Bump the items with higher personal history score if they matched the query
                    return bScore - aScore; // Descending
                });
            }
        }

        let didYouMean = null;
        const facets = {
            categories: {} as Record<string, number>,
            tags: {} as Record<string, number>
        };

        if (!suggest) {
            mappedResults.forEach((p: any) => {
                const cat = p.category || p.category_id || p.category_uz || "Boshqa";
                facets.categories[cat] = (facets.categories[cat] || 0) + 1;
                
                if (p.tag) {
                    facets.tags[p.tag] = (facets.tags[p.tag] || 0) + 1;
                }
            });

            if (mappedResults.length > 0 && searchQuery.length >= 3) {
                const topName = mappedResults[0].name.toLowerCase();
                const originalLower = searchQuery.toLowerCase();
                // If it's a fuzzy match (query not inside the top result name exactly)
                if (!topName.includes(originalLower)) {
                    // Propose the first word of the top item (often the brand / exact product)
                    const words = mappedResults[0].name.split(' ');
                    // e.g. "Ayfon" -> "iPhone"
                    if (words.length > 0 && words[0].toLowerCase() !== originalLower) {
                        didYouMean = words[0];
                    }
                }
            }
        }

        // 4. Record Search Analytics (Non-blocking)
        if (!suggest) {
            supabase.from('search_analytics').insert({
                query: searchQuery,
                results_count: mappedResults.length
            }).then(({ error }) => {
                if (error) console.error("Search analytics logging failed:", error);
            });
        }

        return NextResponse.json({ 
            success: true, 
            results: mappedResults,
            facets,
            didYouMean,
            count: mappedResults.length
        });

    } catch (error: any) {
        console.error("Advanced Search failed:", error);
        return NextResponse.json({ error: "Search failed: " + error.message, results: [] }, { status: 500 });
    }
}

