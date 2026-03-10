import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEYS = [
    process.env.GROQ_API_KEY_1 || "",
    process.env.GROQ_API_KEY_2 || ""
];

let currentKeyIndex = 0;

export async function POST(req: NextRequest) {
    try {
        const { messages, model = "llama-3.1-70b-versatile" } = await req.json();

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
                        model,
                        messages,
                        temperature: 0.7,
                        max_tokens: 1024
                    })
                });

                if (response.status === 429) {
                    throw new Error("Rate limit exceeded");
                }

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || "Groq API error");
                }

                const data = await response.json();
                return NextResponse.json({ content: data.choices[0].message.content });

            } catch (error) {
                currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
                attempts++;
                if (attempts >= maxRetries) {
                    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
                }
            }
        }
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
