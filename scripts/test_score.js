require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkSemanticScore() {
    const { pipeline, cos_sim } = await import('@xenova/transformers');
    
    console.log("Loading AI embedding model...");
    const generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    console.log("Computing embedding for 'soqol oladigan'...");
    const searchOutput = await generateEmbedding("soqol oladigan", { pooling: 'mean', normalize: true });
    const searchVector = Array.from(searchOutput.data);
    
    console.log("Computing embedding for 'soch kesish mashina'...");
    const targetOutput = await generateEmbedding("Professional soch kesish mashinkalari to'plami", { pooling: 'mean', normalize: true });
    const targetVector = Array.from(targetOutput.data);
    
    // We can also just pull the exact embedding from the database
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: vgr } = await supabase.from('products').select('name, embedding').ilike('name', '%vgr%').limit(1).single();
    
    let dbVector;
    if (vgr && typeof vgr.embedding === 'string') dbVector = JSON.parse(vgr.embedding);
    
    // Custom cosine similarity function as fallback
    function cosineSimilarity(A, B) {
        if (!A || !B) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < A.length; i++) {
            dotProduct += A[i] * B[i];
            normA += Math.pow(A[i], 2);
            normB += Math.pow(B[i], 2);
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    console.log("Cosine Sim (JS Model JS Target):", cosineSimilarity(searchVector, targetVector));
    if (dbVector) {
        console.log("Cosine Sim (JS Model DB Vector):", cosineSimilarity(searchVector, dbVector));
    }
}

checkSemanticScore();
