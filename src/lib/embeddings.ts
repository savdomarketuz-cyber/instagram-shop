/**
 * Velari Semantic Search Embeddings Module
 * Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
 * Matches Postgres column: products.embedding vector(384)
 */

let pipelinePromise: Promise<any> | null = null;
const embeddingCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

async function getEmbedder() {
    if (!pipelinePromise) {
        pipelinePromise = (async () => {
            const { pipeline, env } = await import('@xenova/transformers');
            // Disable local model check in production serverless
            env.allowLocalModels = false;
            env.useBrowserCache = false;
            if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
                env.cacheDir = '/tmp/.cache';
            }
            return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        })().catch(err => {
            console.error('Failed to load Xenova embedding model:', err);
            pipelinePromise = null;
            throw err;
        });
    }
    return pipelinePromise;
}

/**
 * Generates a 384-dimensional vector string for pgvector: '[0.1, -0.2, ...]'
 * Uses in-memory cache for instant zero-CPU repeated query lookups.
 * Includes timeout to guarantee serverless response SLAs (<1200ms).
 */
export async function generateQueryEmbedding(rawQuery: string): Promise<string | null> {
    const q = (rawQuery || '').trim().toLowerCase();
    if (!q || q.length < 2) return null;

    // Check in-memory cache first (0 ms)
    if (embeddingCache.has(q)) {
        return embeddingCache.get(q)!;
    }

    try {
        // Race against a timeout to protect serverless latency
        const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Embedding timeout')), 1200)
        );

        const embedPromise = (async () => {
            const embedder = await getEmbedder();
            const output = await embedder(q, { pooling: 'mean', normalize: true });
            const vectorArr = Array.from(output.data);
            return `[${vectorArr.join(',')}]`;
        })();

        const vectorStr = await Promise.race([embedPromise, timeoutPromise]);

        if (vectorStr) {
            // Add to LRU cache
            if (embeddingCache.size >= MAX_CACHE_SIZE) {
                const firstKey = embeddingCache.keys().next().value;
                if (firstKey) embeddingCache.delete(firstKey);
            }
            embeddingCache.set(q, vectorStr);
        }

        return vectorStr;
    } catch (err: any) {
        // Non-blocking fallback: Log warning and return null so text/trigram search proceeds seamlessly
        console.warn(`Query embedding generation skipped for "${q}": ${err?.message || err}`);
        return null;
    }
}
