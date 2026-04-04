import { supabase } from "./supabase";
import type { Product } from "@/types";

/**
 * Server-side AI API orqali chat qilish
 * API kalitlari endi serverda saqlanadi
 */
export async function chatWithGroq(messages: any[], model: string = "llama-3.1-70b-versatile") {
    try {
        const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages, model })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "AI service error");
        }

        const data = await response.json();
        return data.content;
    } catch (error) {
        console.error("AI API error:", error);
        throw error;
    }
}

/**
 * AI Recommendation logic
 * Based on user history and product tags
 */
export async function getAiRecommendations(userInterests: any, allProducts: Product[], userPhone: string = "Unknown") {
    // 1. Check if we have relatively fresh cached recommendations (less than 1 day old)
    try {
        const { data: interests, error } = await supabase
            .from("user_interests")
            .select("*")
            .eq("id", userPhone)
            .single();
        
        if (interests && !error) {
            const lastUpdate = interests.ai_recommendations_updated_at ? new Date(interests.ai_recommendations_updated_at) : null;
            const now = new Date();

            // If recommendations exist and are less than 12h old, return them after filtering for existing products
            if (interests.ai_recommendations && Array.isArray(interests.ai_recommendations) && lastUpdate && (now.getTime() - lastUpdate.getTime() < 12 * 60 * 60 * 1000)) {
                const existingIds = allProducts.map(p => p.id);
                const validatedIds = interests.ai_recommendations.filter((id: string) => existingIds.includes(id));
                
                // If it filtered out too many (e.g. they were all from old database), force a refresh
                if (validatedIds.length >= 3) {
                    return validatedIds;
                }
            }
        }
    } catch (e) {
        console.error("Cache check failed", e);
    }

    // 2. If no cache or cache old, fetch from Groq
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
        const res = await chatWithGroq([
            { role: "system", content: "Sen faqat JSON qaytaruvchi AI yordamchisan." },
            { role: "user", content: prompt }
        ]);

        const jsonMatch = res.match(/\[[\s\S]*\]/);
        let recommendedIds = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        // 3. Filter to ensure IDs still exist in 'allProducts'
        const existingIds = allProducts.map(p => p.id);
        recommendedIds = recommendedIds.filter((id: string) => existingIds.includes(id));

        // 4. Save to Cache in Supabase (Background)
        if (recommendedIds.length > 0) {
            supabase.from("user_interests").upsert({
                id: userPhone,
                user_phone: userPhone,
                ai_recommendations: recommendedIds,
                ai_recommendations_updated_at: new Date().toISOString()
            });
        }

        await supabase.from("ai_logs").insert([{
            id: crypto.randomUUID(),
            user_phone: userPhone,
            input: userInterests,
            output: recommendedIds,
            model: "llama-3.1-70b",
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
        await supabase.from("ai_logs").insert([{
            id: crypto.randomUUID(),
            user_phone: data.userPhone,
            input: data.input,
            output: data.output,
            action: data.action,
            model: data.model || "llama-3.1-70b"
        }]);
    } catch (e) {
        console.error("AI Logging error:", e);
    }
}
