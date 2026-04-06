require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Dynamic import for transformers to compute embedding
async function fetchEmbeddingAndCompare() {
    const { pipeline } = await import('@xenova/transformers');
    
    console.log("Loading AI embedding model...");
    const generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    console.log("Computing embedding for 'soqol oladigan'...");
    const output = await generateEmbedding("soqol oladigan", { pooling: 'mean', normalize: true });
    const embeddingArray = Array.from(output.data);
    
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    console.log("Checking cosine similarity against the VGR product...");
    // We can just calculate it in sql
    const { data: results, error } = await supabase.rpc('advanced_smart_search', {
        search_query: "soqol oladigan",
        query_embedding: `[${embeddingArray.join(',')}]`,
        match_threshold: 0.1, // very low to see what it is
        match_count: 10
    });
    
    if (error) console.error("RPC Error:", error);
    
    if (results && results.length > 0) {
        console.log("Top 5 results:");
        results.slice(0, 5).forEach(r => {
            console.log(`- ${r.name} (Score: ${r.score})`);
        });
    } else {
        console.log("No results even with 0.1 threshold!");
    }
}

fetchEmbeddingAndCompare();
