import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { mapProduct } from '@/lib/mappers';
import { checkRateLimit } from '@/lib/rate-limiter';
import { normalizeQuery, transliterateLatin } from '@/lib/query-normalize';
import { generateQueryEmbedding } from '@/lib/embeddings';
import { getProductRealStock } from '@/lib/stock';
import { verifyJwt } from '@/lib/jwt-utils';

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

export interface VisualAnalysis {
    subject: string;
    brand?: string | null;
    color?: string | null;
    tags: string[];
    searchQuery: string;
}

// Rasmdan qidiruv kalit so'zlarini chiqarish (Groq vision model)
async function extractVisualAnalysisFromImage(imageDataUrl: string): Promise<VisualAnalysis | null> {
    const apiKeys = [process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2].filter(Boolean) as string[];
    if (apiKeys.length === 0) {
        console.warn("[VisualSearch] No Groq API keys configured");
        return null;
    }
    if (imageDataUrl.length > 8_000_000) {
        console.warn("[VisualSearch] Image too large for processing:", imageDataUrl.length);
        return null;
    }

    const models = ['qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'];

    for (const key of apiKeys) {
        for (const model of models) {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${key}`, 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            {
                                role: 'system',
                                content: "Siz elektronika va gadjetlar do'koni uchun Google Lens kabi vizual qidiruv AI tizimisiz. Rasmda tasvirlangan tovar yoki buyumni vizual tahlil qiling. Faqat quyidagi JSON formatida javob bering, boshqa hech qanday so'z yoki belgisiz:\n{\"subject\": \"aniqlangan buyum nomi\", \"brand\": \"brend nomi yoki null\", \"color\": \"asosiy rangi yoki null\", \"tags\": [\"teg1\", \"teg2\"], \"searchQuery\": \"do'kondan qidirish uchun eng optimal 2-4 ta kalit so'z\"}"
                            },
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: "Rasmni vizual tahlil qiling va FAQAT JSON qaytaring." },
                                    { type: 'image_url', image_url: { url: imageDataUrl } }
                                ]
                            }
                        ],
                        temperature: 0.1,
                        max_tokens: 180,
                    }),
                });

                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    console.warn(`[VisualSearch] Groq error (${model}): ${res.status} ${errText}`);
                    continue;
                }

                const data = await res.json();
                const raw = data.choices?.[0]?.message?.content || "";
                // Reasoning teglarini (<think>...</think>) tozalash
                const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        return {
                            subject: parsed.subject || parsed.searchQuery || "Mahsulot",
                            brand: parsed.brand || null,
                            color: parsed.color || null,
                            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
                            searchQuery: parsed.searchQuery || parsed.subject || "elektronika"
                        };
                    } catch {}
                }

                // Fallback: oddiy matn bo'lsa
                const textClean = cleaned.replace(/[*#_`"':\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
                if (textClean) {
                    return {
                        subject: textClean,
                        brand: null,
                        color: null,
                        tags: [],
                        searchQuery: textClean
                    };
                }
            } catch (err: any) {
                console.warn(`[VisualSearch] Groq fetch error (${model}):`, err.message);
            }
        }
    }
    return null;
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
        let detectedVisionQuery: string | null = null;

        // 1. Visual Search — rasm orqali qidiruv
        let visualAnalysis: VisualAnalysis | null = null;
        if (image && !searchQuery) {
            visualAnalysis = await extractVisualAnalysisFromImage(image);
            if (!visualAnalysis || !visualAnalysis.searchQuery) {
                return NextResponse.json({ success: true, results: [], count: 0, message: "Rasmdan mahsulot aniqlanmadi" });
            }
            searchQuery = visualAnalysis.searchQuery;
            detectedVisionQuery = visualAnalysis.subject || visualAnalysis.searchQuery;
        }

        // Typeahead uchun kamida 2 ta belgi bo'lsin
        if (suggest && searchQuery.length < 2) {
            return NextResponse.json({ success: true, results: [], count: 0 });
        }

        // 1.5 User Identifikatsiya (Cookie yoki JWT orqali)
        const userPhoneCookie = req.cookies.get('user_phone')?.value;
        const token = req.cookies.get("user_token")?.value;
        const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback_secret_key_123!";
        let tokenPhone: string | null = null;
        if (token) {
            try {
                const payload = await verifyJwt(token, JWT_SECRET);
                if (payload?.sub && payload.sub !== 'ADMIN') tokenPhone = String(payload.sub);
            } catch {}
        }
        const userIdentifier = userPhone || tokenPhone || userPhoneCookie || null;

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

        let isFallback = false;
        let queryEmbedding: string | null = null;

        const runRpc = async (q: string, threshold: number, emb: string | null = null) => {
            return supabase.rpc('advanced_smart_search', {
                search_query: q,
                query_embedding: emb !== null ? emb : queryEmbedding,
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

        // 1-qadam: Tezkor DB qidiruvi (Trigram + Exact + Prefix match).
        // Supabase Postgres'da 10-15ms ichida ishlaydi, Vercel CPU sarflamaydi.
        let { data: results, error } = await runRpc(normalizedQuery, 0.25, null);

        // 2-qadam: Agar standart matn orqali natija chiqmasa (AI tavsifli qidiruv bo'lsa),
        // faqat shundagina Semantik AI vektor embedding'dan foydalanamiz
        if (!error && (!results || results.length === 0) && normalizedQuery) {
            try {
                queryEmbedding = await generateQueryEmbedding(normalizedQuery);
                if (queryEmbedding) {
                    const { data: semResults, error: semErr } = await runRpc(normalizedQuery, 0.25, queryEmbedding);
                    if (!semErr && semResults && semResults.length > 0) {
                        results = semResults;
                    }
                }
            } catch (embErr) {
                console.warn("AI Semantic Embedding fallback skipped:", embErr);
            }
        }

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

        // 4. Record Search Analytics & User Telemetry to Supabase (Non-blocking)
        if (searchQuery) {
            // A. search_analytics jadvaliga qidiruv so'zi va xaridor telefon raqamini saqlash
            supabaseAdmin.from('search_analytics').insert({
                query: searchQuery,
                results_count: mappedResults.length,
                user_phone: userIdentifier || null
            }).then(({ error }) => {
                if (error) console.error("Search analytics logging failed:", error);
            });

            // B. Agar mijoz login qilgan bo'lsa - telemetriya va user_interests ga yozish
            if (userIdentifier) {
                // 1) Telemetriya logi: qidiruv amali
                supabaseAdmin.from('user_telemetry_logs').insert([{
                    user_identifier: userIdentifier,
                    event_type: 'SEARCH',
                    event_value: searchQuery,
                    event_metadata: { 
                        results_count: mappedResults.length,
                        query: searchQuery,
                        categories: Object.keys(facets.categories).slice(0, 3)
                    }
                }]).then(({ error }) => {
                    if (error) console.error("Search telemetry logging failed:", error);
                });

                // 2) user_interests jadvalida qidiruv toifalariga ball qo'shish (AI tavsiya uchun)
                const topCats = Object.keys(facets.categories).slice(0, 2);
                if (topCats.length > 0) {
                    supabaseAdmin.from('user_interests').select('categories').eq('id', userIdentifier).single().then(({ data }) => {
                        const currentCats = (data?.categories as Record<string, number>) || {};
                        topCats.forEach(c => {
                            currentCats[c] = (currentCats[c] || 0) + 1;
                        });
                        supabaseAdmin.from('user_interests').upsert({
                            id: userIdentifier,
                            user_phone: userIdentifier,
                            categories: currentCats,
                            updated_at: new Date().toISOString()
                        }).then(() => {});
                    }).catch(() => {});
                }
            }
        }

        return NextResponse.json({
            success: true,
            results: mappedResults,
            facets,
            didYouMean,
            isFallback,
            visualAnalysis,
            detectedVisionQuery,
            query: searchQuery,
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
