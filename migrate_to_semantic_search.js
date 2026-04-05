require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    // Dynamically import transformers since it might be ESM-only in some environments
    // But 2.x supports require. 
    const { pipeline } = require('@xenova/transformers');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase. Loading embedding model...');
        const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('Model loaded! Fetching products...');

        const { rows: products } = await client.query('SELECT * FROM products WHERE is_deleted = false');
        console.log(`Found ${products.length} products to index.`);

        for (const p of products) {
            // High-quality search blob: Name + Category + Vision Metadata
            const visionMeta = p.image_metadata ? Object.values(p.image_metadata).map(m => m.alt_uz + ' ' + m.alt_ru).join(' ') : '';
            const searchBlob = `${p.name_uz || p.name} ${p.name_ru || p.name} ${p.category} ${visionMeta} ${p.description_uz || ''}`.trim();

            console.log(`Embedding: ${p.name_uz || p.name}...`);
            const output = await embedder(searchBlob, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data);

            // Save to DB
            // We use standard string format for pgvector: '[0.1, 0.2, ...]'
            const vectorStr = `[${embedding.join(',')}]`;
            await client.query('UPDATE products SET embedding = $1 WHERE id = $2', [vectorStr, p.id]);
        }

        console.log('✅ All products have been semantic-indexed!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

main();
