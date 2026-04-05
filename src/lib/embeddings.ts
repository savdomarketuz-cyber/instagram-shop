import { pipeline, env } from '@xenova/transformers';

// Optimization for Vercel/Serverless: Use WASM and remote models
env.allowLocalModels = false; // Fetch from HF (remote)
if (env.backends && env.backends.onnx) {
    env.backends.onnx.wasm.numThreads = 1;
}

class EmbeddingPipeline {
    static instance: any = null;

    static async getInstance() {
        if (this.instance === null) {
            // small, fast, and high quality (384 dimensional)
            // we will upscale/pad to 1536 if needed or just use 384 in DB
            // Wait, my DB was set to 1536. I should change it to 384 for all-MiniLM-L6-v2
            this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
        return this.instance;
    }
}

export async function generateEmbedding(text: string): Promise<number[]> {
    const embedder = await EmbeddingPipeline.getInstance();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
}
