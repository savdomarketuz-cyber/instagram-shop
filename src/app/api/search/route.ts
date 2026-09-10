import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { mapProduct } from '@/lib/mappers';
import { checkRateLimit } from '@/lib/rate-limiter';
import { normalizeQuery, transliterateLatin } from '@/lib/query-normalize';
import { generateQueryEmbedding } from '@/lib/embeddings';
import { getProductRealStock } from '@/lib/stock';

/**
 * Admin "Qidiruv Lug'ati" (search_synonyms) jadvalidagi sinonimlarni qo'llaydi.
 * keyword (xaridor yozadigan) → maps_to (asl izlanadigan). RLS chetlab service role bilan o'qiladi.
 * Lug'at xotirada 5 daqiqa keshlanadi.
 */
const SYNONYMS_TTL_MS = 5 * 60 * 1000;
let synonymsCache: { map: Record<string, string>; expires: number } | null = null;

async function getSynonymsMap(): Promise<Record<string, string>> {
    const now = Date.now();
    if (synonymsCache && synonymsCache.expires > now) return synonymsCache.map;
    try {
        const { data, error } = await supabaseAdmin
            .from('search_synonyms')
            .select('keyword, maps_to')
            .limit(2000);
        if (error) throw error;
        const map: Record<string, string> = {};
        for (const row of data || []) map[(row.keyword || '').toLowerCase()] = row.maps_to;
        synonymsCache = { map, expires: now + SYNONYMS_TTL_MS };
        return map;
    } catch {
        return synonymsCache?.map || {};
    }
}

async function applyDbSynonyms(raw: string): Promise<string> {
    const lower = (raw || '').toLowerCase().trim();
    if (!lower) return raw;
    const map = await getSynonymsMap();
    if (map[lower]) return map[lower];
    return lower.split(/\s+/).map(w => map[w] || w).join(' ');
}

// Rasmdan qidiruv kalit so'zlarini chiqarish (Groq vision)
async function extractKeywordsFromImage(imageDataUrl: string): Promise<string | null> {
    const apiKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2;
    if (!apiKey) return null;
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
        const body = await req.json();
        const { 
            query, 
            image, 
            suggest, 
            userPhone,
            page = 1,
            limit = suggest ? 6 : 24,
            category,
            brand,
            brands,
            minPrice,
            maxPrice,
            rating,
            sort
        } = body;

        const brandIdsList: string[] = Array.isArray(brands) && brands.length > 0
            ? brands.filter(Boolean)
            : (brand ? [brand] : []);

        // 0. RATE LIMITING
        const rlMax = suggest ? 50 : 15;
        if (!await checkRateLimit(suggest ? `${ip}:s` : ip, rlMax, 60)) {
            return NextResponse.json({ success: false, message: "Juda ko'p urinish.", results: [] }, { status: 429 });
        }

        let searchQuery = (query || "").trim();

        // 1. Visual Search — rasm orqali qidiruv
        if (image && !searchQuery) {
            const visionKeywords = await extractKeywordsFromImage(image);
            if (!visionKeywords) {
                return NextResponse.json({ success: true, results: [], count: 0, message: "Rasmdan mahsulot aniqlanmadi" });
            }
            searchQuery = visionKeywords;
        }

        // Typeahead uchun kamida 2 ta belgi bo'lsin
        if (suggest && searchQuery.length < 2) {
            return NextResponse.json({ success: true, results: [], count: 0 });
        }

        // 1.5 User Identifikatsiya
        const userPhoneCookie = req.cookies.get('user_phone')?.value;
        const userIdentifier = userPhone || userPhoneCookie || null;

        // 2. Normalizatsiya & Sinonimlar
        const dbNormalized = await applyDbSynonyms(searchQuery);
        const normalizedQuery = normalizeQuery(dbNormalized);

        // ==========================================
        // TYPEAHEAD MODE: FAST LIGHTWEIGHT RPC
        // ==========================================
        if (suggest) {
            const { data: suggestRows, error: suggestErr } = await supabase.rpc('suggest_products', {
                search_query: normalizedQuery,
                match_count: limit || 6
            });

            if (!suggestErr && suggestRows) {
                const mapped = suggestRows.map(mapProduct).filter((p: any) => getProductRealStock(p) > 0);
                return NextResponse.json({
                    success: true,
                    results: mapped,
                    count: mapped.length
                });
            }

            // Fallback for suggest
            const { data: fallbackRows } = await supabase
                .from('products')
                .select('id, name, name_uz, name_ru, price, old_price, image, images, image_metadata, category_id, model, article, stock, stock_details')
                .or(`name.ilike.%${normalizedQuery}%,name_uz.ilike.%${normalizedQuery}%,name_ru.ilike.%${normalizedQuery}%,model.ilike.%${normalizedQuery}%,article.ilike.%${normalizedQuery}%`)
                .eq('is_deleted', false)
                .limit(limit || 6);

            const mapped = (fallbackRows || []).map(mapProduct).filter((p: any) => getProductRealStock(p) > 0);
            return NextResponse.json({
                success: true,
                results: mapped,
                count: mapped.length
            });
        }

        // ==========================================
        // FULL SEARCH MODE: SEMANTIC + BEHAVIORAL RPC
        // ==========================================
        const currentPage = Math.max(1, Number(page) || 1);
        const currentLimit = Math.min(100, Math.max(1, Number(limit) || 24));
        const offset = (currentPage - 1) * currentLimit;

        // Semantic Query Embedding yaratish (384-dim, cached)
        let queryEmbedding: string | null = null;
        if (normalizedQuery) {
            queryEmbedding = await generateQueryEmbedding(normalizedQuery);
        }

        let isFallback = false;

        const runRpc = async (q: string, threshold: number) => {
            return supabase.rpc('advanced_smart_search', {
                search_query: q,
                query_embedding: queryEmbedding,
                match_threshold: threshold,
                match_count: currentLimit + 1, // +1 to determine hasMore accurately
                p_user_identifier: userIdentifier,
                p_category_id: category || null,
                p_min_price: minPrice && minPrice > 0 ? Number(minPrice) : null,
                p_max_price: maxPrice && maxPrice > 0 ? Number(maxPrice) : null,
                p_brand_id: brandIdsList.length === 1 ? brandIdsList[0] : (brand || null),
                p_min_rating: rating && rating > 0 ? Number(rating) : null,
                p_sort: sort || null,
                p_offset: offset,
                p_brand_ids: brandIdsList.length > 0 ? brandIdsList : null
            });
        };

        let { data: results, error } = await runRpc(normalizedQuery, 0.25);

        if (error) {
            console.error("advanced_smart_search RPC error:", error);
            const sanitizedQuery = normalizedQuery.replace(/[,"'\\]/g, ' ').trim();
            let fallbackQuery = supabase
                .from('products')
                .select('id,name,name_uz,name_ru,price,old_price,image,images,image_metadata,sales,avg_rating,review_count,stock,stock_details,category_id,brand_id,video_url,model,color_name,group_id,is_original,article,express_delivery,created_at')
                .eq('is_deleted', false)
                .or('stock.gt.0,stock_details.neq.{}');

            if (sanitizedQuery) {
                fallbackQuery = fallbackQuery.or(`name.ilike.%${sanitizedQuery}%,name_uz.ilike.%${sanitizedQuery}%,name_ru.ilike.%${sanitizedQuery}%,article.ilike.%${sanitizedQuery}%,model.ilike.%${sanitizedQuery}%`);
            }
            if (category) fallbackQuery = fallbackQuery.eq('category_id', category);
            if (brandIdsList.length > 0) {
                fallbackQuery = fallbackQuery.in('brand_id', brandIdsList);
            }
            if (minPrice && minPrice > 0) fallbackQuery = fallbackQuery.gte('price', Number(minPrice));
            if (maxPrice && maxPrice > 0) fallbackQuery = fallbackQuery.lte('price', Number(maxPrice));

            const { data: textResults } = await fallbackQuery
                .range(offset, offset + currentLimit);

            results = textResults || [];
        }

        let rawResults = results || [];

        // 3.1 Fallback — Kirill translit yoki threshold yumshatish
        if (!error && rawResults.length === 0 && searchQuery) {
            const translit = normalizeQuery(transliterateLatin(dbNormalized));
            if (translit && translit.toLowerCase() !== normalizedQuery.toLowerCase()) {
                const { data: tr } = await runRpc(translit, 0.25);
                if (tr && tr.length > 0) rawResults = tr;
            }
            if (rawResults.length === 0) {
                const { data: relaxed } = await runRpc(normalizedQuery, 0.15);
                if (relaxed && relaxed.length > 0) {
                    rawResults = relaxed;
                    isFallback = true;
                }
            }
        }

        // Pagination: hasMore hisoblash
        const hasMore = rawResults.length > currentLimit;
        const pageItems = hasMore ? rawResults.slice(0, currentLimit) : rawResults;

        // Map results consistently
        let mappedResults = pageItems.map(mapProduct).filter((p: any) => getProductRealStock(p) > 0);

        // Kategoriya ID -> NOM boyitish
        const categoryNames: Record<string, { uz: string; ru: string }> = {};
        const catIds = Array.from(new Set(
            mappedResults
                .map((p: any) => p.category ?? p.category_id)
                .filter((v: any) => v !== null && v !== undefined && v !== '')
        ));

        if (catIds.length > 0) {
            const { data: cats } = await supabase
                .from('categories')
                .select('id, name, name_uz, name_ru')
                .in('id', catIds);
            if (cats) {
                for (const c of cats) {
                    categoryNames[String(c.id)] = {
                        uz: c.name_uz || c.name || '',
                        ru: c.name_ru || c.name_uz || c.name || '',
                    };
                }
                mappedResults = mappedResults.map((p: any) => {
                    const nm = categoryNames[String(p.category ?? p.category_id)];
                    return nm ? { ...p, category_uz: nm.uz, category_ru: nm.ru } : p;
                });
            }
        }

        // Facets tayyorlash
        const facets = {
            categories: {} as Record<string, number>,
            tags: {} as Record<string, number>,
            categoryNames,
        };

        mappedResults.forEach((p: any) => {
            const cat = p.category || p.category_id || p.category_uz || "Boshqa";
            facets.categories[cat] = (facets.categories[cat] || 0) + 1;
            if (p.tag) {
                facets.tags[p.tag] = (facets.tags[p.tag] || 0) + 1;
            }
        });

        // "Balki shuni nazarda tutdingizmi?"
        let didYouMean = null;
        if (searchQuery.length >= 3 && normalizedQuery.toLowerCase() !== searchQuery.toLowerCase()) {
            didYouMean = normalizedQuery;
        }

        // 4. Record Search Analytics (Non-blocking)
        if (searchQuery) {
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
            page: currentPage,
            limit: currentLimit,
            hasMore,
            count: mappedResults.length
        });

    } catch (error: any) {
        console.error("Advanced Search failed:", error);
        return NextResponse.json({ error: "Search failed: " + error.message, results: [] }, { status: 500 });
    }
}
