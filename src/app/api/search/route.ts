import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { mapProduct } from '@/lib/mappers';
import { checkRateLimit } from '@/lib/rate-limiter';
import { normalizeQuery, transliterateLatin } from '@/lib/query-normalize';

/**
 * Admin "Qidiruv Lug'ati" (search_synonyms) jadvalidagi sinonimlarni qo'llaydi.
 * keyword (xaridor yozadigan) → maps_to (asl izlanadigan). RLS chetlab service role bilan o'qiladi.
 */
async function applyDbSynonyms(raw: string): Promise<string> {
    const lower = (raw || '').toLowerCase().trim();
    if (!lower) return raw;
    const words = lower.split(/\s+/);
    const candidates = Array.from(new Set([lower, ...words]));
    try {
        const { data } = await supabaseAdmin
            .from('search_synonyms')
            .select('keyword, maps_to')
            .in('keyword', candidates);
        if (!data || data.length === 0) return raw;
        const map: Record<string, string> = {};
        for (const row of data) map[(row.keyword || '').toLowerCase()] = row.maps_to;
        // To'liq so'rov mosligi ustuvor
        if (map[lower]) return map[lower];
        // So'zma-so'z almashtirish
        return words.map(w => map[w] || w).join(' ');
    } catch {
        return raw;
    }
}

// Rasmdan qidiruv kalit so'zlarini chiqarish (Groq vision)
async function extractKeywordsFromImage(imageDataUrl: string): Promise<string | null> {
    const apiKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2;
    if (!apiKey) return null;
    // base64 hajm cheklovi (~4MB)
    if (imageDataUrl.length > 6_000_000) return null;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: "Rasmдagi asosiy mahsulotni aniqlang. FAQAT qidiruv uchun 2-4 ta kalit so'z qaytaring (brend, mahsulot turi, rang). Boshqa matn yo'q. Masalan: 'VGR soch olish mashinkasi' yoki 'simsiz quloqchin oq'." },
                        { type: 'image_url', image_url: { url: imageDataUrl } }
                    ]
                }],
                temperature: 0.1,
                max_tokens: 50,
            }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const kw = (data.choices?.[0]?.message?.content || "").trim().replace(/['"]/g, '').slice(0, 80);
        return kw || null;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        const { query, image, suggest, userPhone } = await req.json();

        // 0. RATE LIMITING — typeahead (suggest) har keystroke'da chaqirilgani uchun
        // yumshoqroq cheklov; to'liq qidiruv qattiqroq.
        const rlMax = suggest ? 40 : 12;
        if (!await checkRateLimit(suggest ? `${ip}:s` : ip, rlMax, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish.", results: [] }, { status: 429 });
        }

        let searchQuery = (query || "").trim();

        // 1. Visual Search — rasmni Groq vision bilan tahlil qilib kalit so'z chiqarish
        if (image && !searchQuery) {
            const visionKeywords = await extractKeywordsFromImage(image);
            if (!visionKeywords) {
                return NextResponse.json({ success: true, results: [], count: 0, message: "Rasmdan mahsulot aniqlanmadi" });
            }
            searchQuery = visionKeywords;
        }

        if (!searchQuery) {
            return NextResponse.json({ results: [] });
        }

        // Typeahead uchun bitta belgi RPC chaqirmasin
        if (suggest && searchQuery.length < 2) {
            return NextResponse.json({ success: true, results: [], count: 0 });
        }

        // 1.5 Identify User for Affinity Profiling
        const userPhoneCookie = req.cookies.get('user_phone')?.value;
        const userIdentifier = userPhone || userPhoneCookie || null;

        // 2. Normalize query — kod ichidagi typo/transliteratsiya xaritasi (0ms, sinxron).
        // Admin DB sinonim lug'ati faqat to'liq qidiruvda (suggest emas) — typeahead'da
        // har keystroke'ga DB roundtrip qo'shmaslik uchun.
        const dbNormalized = suggest ? searchQuery : await applyDbSynonyms(searchQuery);
        const normalizedQuery = normalizeQuery(dbNormalized);

        // 3. Behavioral + affinity ranked search (tokenized + word_similarity + telemetry + profile)
        let finalResults: any[] = [];
        let isFallback = false;

        const runRpc = (q: string, threshold: number) => supabase.rpc('advanced_smart_search', {
            search_query: q,
            query_embedding: null,
            match_threshold: threshold,
            match_count: suggest ? 6 : 50,
            p_user_identifier: suggest ? null : userIdentifier,
        });

        // match_threshold endi word_similarity chegarasi (token darajasida fuzzy).
        const { data: results, error } = await runRpc(normalizedQuery, 0.30);

        if (error) {
            console.error("advanced_smart_search RPC error:", error);
            const sanitizedQuery = normalizedQuery.replace(/[,"'\\]/g, ' ').trim();
            const { data: textResults } = await supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${sanitizedQuery}%,name_uz.ilike.%${sanitizedQuery}%,name_ru.ilike.%${sanitizedQuery}%,article.ilike.%${sanitizedQuery}%,model.ilike.%${sanitizedQuery}%`)
                .eq('is_deleted', false)
                .limit(suggest ? 6 : 20);

            if (textResults) finalResults = textResults;
        } else {
            finalResults = results || [];
        }

        // 3.1 FALLBACK — hech narsa topilmasa, hech qachon bo'sh ko'cha bermaslik.
        // (a) kirillcha so'rovni lotinga o'girib qayta sinash (klipper→clipper),
        // (b) word_similarity chegarasini pasaytirib eng yaqin mahsulotlarni ko'rsatish.
        if (!error && finalResults.length === 0 && searchQuery) {
            const translit = normalizeQuery(transliterateLatin(dbNormalized));
            if (translit && translit.toLowerCase() !== normalizedQuery.toLowerCase()) {
                const { data: tr } = await runRpc(translit, 0.30);
                if (tr && tr.length > 0) finalResults = tr;
            }
            if (finalResults.length === 0) {
                const { data: relaxed } = await runRpc(normalizedQuery, 0.18);
                if (relaxed && relaxed.length > 0) { finalResults = relaxed; isFallback = true; }
            }
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

            // "Balki shuni nazarda tutdingizmi?" — normalizatsiya/transliteratsiya
            // so'rovni o'zgartirgan bo'lsa (ayrpods→AirPods, клиппер→clipper), shuni taklif qilamiz.
            // Mahsulot nomidan tasodifiy so'z olishdan ko'ra ishonchli signal.
            if (searchQuery.length >= 3 && normalizedQuery.toLowerCase() !== searchQuery.toLowerCase()) {
                didYouMean = normalizedQuery;
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
            isFallback,
            count: mappedResults.length
        });

    } catch (error: any) {
        console.error("Advanced Search failed:", error);
        return NextResponse.json({ error: "Search failed: " + error.message, results: [] }, { status: 500 });
    }
}

