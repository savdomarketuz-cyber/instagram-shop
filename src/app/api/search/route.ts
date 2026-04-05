import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(req: NextRequest) {
    try {
        const { query, image, imageUrl } = await req.json();

        let searchBlob = query || "";

        // Visual Search Logic
        if (image || imageUrl) {
            console.log("Visual Search triggered via Image");
            // 1. Analyze image via Groq Vision
            const visionResponse = await fetch(`${req.nextUrl.origin}/api/ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate_from_image',
                    context: { images: [imageUrl || image] }
                })
            });
            const visionData = await visionResponse.json();
            const description = visionData.debug?.visualDescription || visionData.result?.description_uz || "";
            
            if (description) {
                // Combine with query if any
                searchBlob = `${query || ""} ${description}`.trim();
            }
        }

        if (!searchBlob) {
            return NextResponse.json({ results: [] });
        }

        // 2. Generate Semantic Vector
        console.log(`Searching for: ${searchBlob}`);
        const embedding = await generateEmbedding(searchBlob);

        // 3. Match in Supabase via RPC
        const { data: results, error } = await supabase.rpc('match_products', {
            query_embedding: embedding,
            match_threshold: 0.1, // very loose for now
            match_count: 20
        });

        if (error) throw error;

        return NextResponse.json({ 
            success: true, 
            results,
            debug: { queryUsed: searchBlob } 
        });

    } catch (error: any) {
        console.error("Advanced Search failed:", error);
        return NextResponse.json({ error: "Search failed: " + error.message }, { status: 500 });
    }
}
