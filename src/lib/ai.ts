import { db, addDoc, collection, doc, getDoc, setDoc } from "./firebase";
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
export async function getAiRecommendations(userInterests: Record<string, unknown>, allProducts: Product[], userPhone: string = "Unknown") {
    // 1. Check if we have relatively fresh cached recommendations (less than 1 day old)
    try {
        const interestsRef = doc(db, "user_interests", userPhone);
        const snap = await getDoc(interestsRef);
        if (snap.exists()) {
            const data = snap.data();
            const lastUpdate = data.aiRecommendationsUpdatedAt ? new Date(data.aiRecommendationsUpdatedAt) : null;
            const now = new Date();
            
            // If recommendations exist and are less than 24h old, return them
            if (data.aiRecommendations && lastUpdate && (now.getTime() - lastUpdate.getTime() < 24 * 60 * 60 * 1000)) {
                // Cache hit — keyingi so'rov uchun yangilanmaydi
                return data.aiRecommendations;
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
        .filter(p => topCategories.includes(p.category) || (p.tags && p.tags.some((t: string) => topCategories.includes(t))))
        .slice(0, 40);

    const productsContext = relevantProducts.map(p => ({ id: p.id, name: p.name, category: p.category, tags: p.tags }));

    const prompt = `
        Sen professional sotuvchi AI yordamchisan. 
        Mijozning qiziqishlari: ${JSON.stringify(userInterests)}
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
        const recommendedIds = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        // 3. Save to Cache in Firestore (Background)
        if (recommendedIds.length > 0) {
            setDoc(doc(db, "user_interests", userPhone), {
                aiRecommendations: recommendedIds,
                aiRecommendationsUpdatedAt: new Date().toISOString()
            }, { merge: true }).catch(e => console.error("Cache save failed", e));
        }

        await addDoc(collection(db, "ai_logs"), {
            timestamp: new Date().toISOString(),
            userPhone,
            input: userInterests,
            output: recommendedIds,
            model: "llama-3.1-70b",
            action: "personalized_recommendation_refreshed"
        });

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
        await addDoc(collection(db, "ai_logs"), {
            timestamp: new Date().toISOString(),
            ...data,
            model: data.model || "llama-3.1-70b"
        });
    } catch (e) {
        console.error("AI Logging error:", e);
    }
}
