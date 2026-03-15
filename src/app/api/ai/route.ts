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

        const { messages, model = "llama-3.3-70b-versatile" } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Messages required" }, { status: 400 });
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
                        model: attempts > 0 ? "llama-3.1-8b-instant" : model,
                        messages,
                        temperature: 0.7,
                        max_tokens: 1024
                    })
                });

                if (response.status === 429) {
                    console.warn(`Groq Rate Limit on Key ${currentKeyIndex + 1}`);
                    throw new Error("Rate limit exceeded");
                }

                if (!response.ok) {
                    const errorJson = await response.json().catch(() => ({}));
                    console.error(`Groq API Error on Key ${currentKeyIndex + 1}:`, errorJson);
                    throw new Error(errorJson.error?.message || "Groq API error");
                }

                const data = await response.json();
                return NextResponse.json({ content: data.choices[0].message.content });

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
