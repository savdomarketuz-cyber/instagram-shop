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

        // 1.5 Identify User for Affinity Profiling
        const userPhoneCookie = req.cookies.get('user_phone')?.value;
        const fallbackSession = req.headers.get('x-forwarded-for') || req.ip || 'anonymous_session';
        const userIdentifier = userPhone || userPhoneCookie || fallbackSession;

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

        // 3. Call Advanced Smart Search RPC (Fuzzy + Weighted + Semantic + Affinity)
        const { data: results, error } = await supabase.rpc('advanced_smart_search', {
            search_query: searchQuery,
            query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
            match_threshold: 0.15, // lowered from 0.25 to catch broader Uzbek semantics
            match_count: suggest ? 5 : 50,
            p_user_identifier: userIdentifier // Pass Phase 3 Identity
        });
        
        if (error) {
            console.error("Supabase RPC search error:", error);
            throw error;
        }

        // 3.5 Fallback to basic text search if smart search returns nothing
        let finalResults = results || [];
        if (finalResults.length === 0 && searchQuery.length >= 2) {
            console.log("Smart search empty, trying fallback text search...");
            const { data: textResults } = await supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${searchQuery}%,name_uz.ilike.%${searchQuery}%,name_ru.ilike.%${searchQuery}%,article.ilike.%${searchQuery}%`)
                .eq('is_deleted', false)
                .limit(suggest ? 5 : 20);
            
            if (textResults) finalResults = textResults;
        }

        // Map results consistently with the rest of the app
        let mappedResults = finalResults.map(mapProduct);

        // 3.5 Personalization logic
        if (userPhone && mappedResults.length > 0 && !suggest) {
            const { data: interests } = await supabase
                .from('user_interests')
                .select('categories')
                .eq('user_phone', userPhone)
                .single();
                
            if (interests && interests.categories) {
                const catWeights = interests.categories as Record<string, number>;
                const maxWeight = Math.max(...Object.values(catWeights).map(Number), 1);

                // Personalization bonusi qo'shish (20%), relevance order-ni buzmaslik uchun
                const totalItems = mappedResults.length;
                mappedResults = mappedResults
                    .map((item: any, index: number) => {
                        const cat = item.category || item.category_id || item.category_uz || '';
                        const personalScore = (Number(catWeights[cat]) || 0) / maxWeight; // 0..1
                        const relevanceScore = totalItems > 1 ? 1 - (index / (totalItems - 1)) : 1; // 1..0
                        return { ...item, _blendedScore: relevanceScore * 0.8 + personalScore * 0.2 };
                    })
                    .sort((a: any, b: any) => b._blendedScore - a._blendedScore)
                    .map(({ _blendedScore, ...rest }: any) => rest);
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

