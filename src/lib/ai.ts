import { supabaseAdmin } from "./supabase-admin";
import type { Product } from "@/types";

/**
 * AI Recommendation logic
 * Based on user history and product tags
 */
export async function getAiRecommendations(userInterests: any, allProducts: Product[], userPhone: string = "Unknown") {
    // 1. Check if we have relatively fresh cached recommendations (less than 12h old)
    try {
        const { data: interests, error } = await supabaseAdmin
            .from("user_interests")
            .select("*")
            .eq("id", userPhone)
            .single();
        
        if (interests && !error) {
            const lastUpdate = interests.ai_recommendations_updated_at ? new Date(interests.ai_recommendations_updated_at) : null;
            const now = new Date();

            if (interests.ai_recommendations && Array.isArray(interests.ai_recommendations) && lastUpdate && (now.getTime() - lastUpdate.getTime() < 12 * 60 * 60 * 1000)) {
                const existingIds = allProducts.map(p => p.id);
                const validatedIds = interests.ai_recommendations.filter((id: string) => existingIds.includes(id));
                
                if (validatedIds.length >= 3) {
                    return validatedIds;
                }
            }
        }
    } catch (e) {
        console.error("Cache check failed", e);
    }

    // 2. If no cache or cache old, fetch from Groq
    // Note: Since this is server-side now, we need to call the actual Groq API or the existing /api/ai logic
    // For simplicity, we'll keep calling the /api/ai or move that logic here.
    // However, to keep it clean, we'll assume this function is called on the server where we have API keys.
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2;
    if (!GROQ_API_KEY) return [];

    const topCategories = Object.entries((userInterests.categories as Record<string, number>) || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat);

    const relevantProducts = allProducts
        .filter(p => topCategories.includes(p.category) || (p.tag && topCategories.includes(p.tag)))
        .slice(0, 40);

    const productsContext = relevantProducts.map(p => ({ id: p.id, name: p.name, category: p.category }));

    const prompt = `
        Sen professional sotuvchi AI yordamchisan. 
        Mijozning qiziqishlari: ${JSON.stringify(userInterests.categories)}
        Mavjud mahsulotlar: ${JSON.stringify(productsContext)}

        Mijoz uchun eng mos 6 ta mahsulot ID raqamlarini JSON formatida qaytar. 
        Faqat JSON bo'lsin: ["id1", "id2", "id3", "id4", "id5", "id6"]
    `;

    try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Sen faqat JSON qaytaruvchi AI yordamchisan." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!groqResponse.ok) throw new Error("Groq API error");
        const data = await groqResponse.json();
        const content = data.choices[0].message.content;
        
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        let recommendedIds = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        // 3. Filter to ensure IDs still exist in 'allProducts'
        const existingIds = allProducts.map(p => p.id);
        recommendedIds = recommendedIds.filter((id: string) => existingIds.includes(id));

        // 4. Save to Cache in Supabase (Background)
        if (recommendedIds.length > 0) {
            await supabaseAdmin.from("user_interests").upsert({
                id: userPhone,
                user_phone: userPhone,
                ai_recommendations: recommendedIds,
                ai_recommendations_updated_at: new Date().toISOString()
            });
        }

        await supabaseAdmin.from("ai_logs").insert([{
            id: crypto.randomUUID(),
            user_phone: userPhone,
            input: userInterests,
            output: recommendedIds,
            model: "llama-3.3-70b-versatile",
            action: "personalized_recommendation_refreshed"
        }]);

        return recommendedIds;
    } catch (e) {
        console.error("AI Recommendation error:", e);
        return [];
    }
}

export async function logAiActivity(data: {
    userPhone: string;
    action: string;
    input: any;
    output: any;
    model?: string;
}) {
    try {
        await supabaseAdmin.from("ai_logs").insert([{
            id: crypto.randomUUID(),
            user_phone: data.userPhone,
            input: data.input,
            output: data.output,
            action: data.action,
            model: data.model || "llama-3.3-70b-versatile"
        }]);
    } catch (e) {
        console.error("AI Logging error:", e);
    }
}
