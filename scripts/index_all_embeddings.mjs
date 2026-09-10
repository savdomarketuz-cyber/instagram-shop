import fs from 'fs';
import pg from 'pg';

const url = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/132d8379-3723-45a6-a02d-bb9203322573/scratch/db_url.txt', 'utf8').trim();

async function main() {
    console.log('Loading Xenova pipeline for all-MiniLM-L6-v2...');
    const { pipeline } = await import('@xenova/transformers');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ Model loaded successfully!');

    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
        const client = new pg.Client({
            connectionString: url,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
        });

        try {
            await client.connect();

            // Fetch a batch of 50 items needing embeddings
            const { rows: batch } = await client.query(`
                SELECT id, name, name_uz, name_ru, description, description_uz, description_ru, category_id, model, article, image_metadata
                FROM products
                WHERE is_deleted = false AND (embedding IS NULL)
                LIMIT 50
            `);

            if (batch.length === 0) {
                hasMore = false;
                console.log('No more products needing embeddings!');
                break;
            }

            console.log(`Processing batch of ${batch.length} products...`);
            for (const p of batch) {
                const visionMeta = p.image_metadata ? Object.values(p.image_metadata).map(m => (m.alt_uz || '') + ' ' + (m.alt_ru || '')).join(' ') : '';
                const searchBlob = `${p.name_uz || p.name || ''} ${p.name_ru || p.name || ''} ${p.model || ''} ${p.article || ''} ${visionMeta} ${(p.description_uz || p.description || '').slice(0, 300)}`.trim();

                const output = await embedder(searchBlob, { pooling: 'mean', normalize: true });
                const vectorStr = `[${Array.from(output.data).join(',')}]`;

                await client.query('UPDATE products SET embedding = $1 WHERE id = $2', [vectorStr, p.id]);
                totalProcessed++;
            }
            console.log(`✅ Batch complete. Total indexed so far: ${totalProcessed}`);

        } catch (err) {
            console.error('Batch error, retrying in 2s:', err.message);
            await new Promise(r => setTimeout(r, 2000));
        } finally {
            try { await client.end(); } catch {}
        }
    }

    // Final verify
    const verifyClient = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await verifyClient.connect();
    const checkFinal = await verifyClient.query('SELECT count(*) as total, count(embedding) as with_embedding FROM products WHERE is_deleted = false');
    console.log('\n=== FINAL EMBEDDING STATUS ===');
    console.table(checkFinal.rows);
    await verifyClient.end();
}

main();
