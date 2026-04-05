import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEYS = [
    process.env.GROQ_API_KEY_1 || "",
    process.env.GROQ_API_KEY_2 || ""
].filter(key => key !== "");

let currentKeyIndex = 0;

export async function POST(req: NextRequest) {
    try {
        if (GROQ_API_KEYS.length === 0) {
            console.error("AI API Error: GROQ_API_KEYS are missing in environment variables.");
            return NextResponse.json({ error: "AI configuration missing" }, { status: 503 });
        }

        const body = await req.json();
        const { messages: rawMessages, model = "llama-3.3-70b-versatile", action, context } = body;

        let finalModel = model;
        let finalMessages = rawMessages;
        let responseFormat: any = undefined;
        let visualDescription = "";

        // Vision AI Logic
        if (action === 'generate_from_image') {
            const imageUrl = context?.image || context?.imageUrl || (context?.images && context.images[0]);
            if (!imageUrl) return NextResponse.json({ error: "Rasm topilmadi" }, { status: 400 });

            try {
                // Step 1: Vision analysis
                const imgResponse = await fetch(imageUrl);
                const arrayBuffer = await imgResponse.arrayBuffer();
                const base64Image = Buffer.from(arrayBuffer).toString('base64');
                const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

                const visionApiKey = GROQ_API_KEYS[currentKeyIndex];
                const visionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${visionApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: "Ushbu rasmdagi mahsulotni professional darajada tahlil qiling. Brend, model, rang va asosiy xususiyatlarini aniqlang." },
                                    { type: 'image_url', image_url: { url: `data:${contentType};base64,${base64Image}` } }
                                ]
                            }
                        ],
                        temperature: 0.2,
                    }),
                });

                const visionData = await visionResponse.json();
                visualDescription = visionData.choices?.[0]?.message?.content || "";

                if (!visualDescription) throw new Error("Vision AI failed to analyze");

                // Step 2: Reasoning & Content Generation
                finalModel = "openai/gpt-oss-120b";
                finalMessages = [
                    { role: 'system', content: 'Siz professional marketing tahlilchisiz. JAVOB FAQAT TOZA JSON BO\'LSIN.' },
                    { 
                        role: 'user', 
                        content: `Mana bu mahsulotning vizual tahlili: ${visualDescription}. 
                        Ushbu ma'lumotlar asosida mahsulot uchun nom, qisqa va to'liq tavsif, brend va kategoriyani aniqlang.
                        JAVOB FAQAT USHBU FORMATDA BO'LSIN (JSON):
                        {
                            "name_uz": "...",
                            "name_ru": "...",
                            "description_uz": "...",
                            "description_ru": "...",
                            "short_uz": "...",
                            "short_ru": "...",
                            "brand": "...",
                            "category_guess": "..."
                        }` 
                    }
                ];
                responseFormat = { type: 'json_object' };

            } catch (err: any) {
                console.error("Vision Step Error:", err);
                return NextResponse.json({ error: "Vision analysis failed: " + err.message }, { status: 500 });
            }
        }

        const maxRetries = GROQ_API_KEYS.length;
        let attempts = 0;

        while (attempts < maxRetries) {
            const apiKey = GROQ_API_KEYS[currentKeyIndex];
            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: finalModel,
                        messages: finalMessages,
                        temperature: 0.7,
                        max_tokens: 4000,
                        response_format: responseFormat
                    })
                });

                if (response.status === 429) {
                    currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
                    throw new Error("Rate limit exceeded");
                }

                if (!response.ok) {
                    const errorJson = await response.json().catch(() => ({}));
                    throw new Error(errorJson.error?.message || "Groq API error");
                }

                const data = await response.json();
                const content = data.choices[0].message.content;

                if (responseFormat?.type === 'json_object') {
                    try {
                        const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
                        return NextResponse.json({ result: parsed, visualDescription });
                    } catch (e) {
                        return NextResponse.json({ result: content, visualDescription });
                    }
                }

                return NextResponse.json({ content, visualDescription });

            } catch (error: any) {
                console.error(`AI Attempt ${attempts + 1} failed:`, error.message);
                currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
                attempts++;
                if (attempts >= maxRetries) {
                    return NextResponse.json({ error: "AI service unavailable: " + error.message }, { status: 503 });
                }
            }
        }
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
