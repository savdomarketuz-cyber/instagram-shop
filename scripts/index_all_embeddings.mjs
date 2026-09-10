import pg from 'pg';
import { getDatabaseUrl } from './get_db_url.mjs';
import { buildEmbeddingText, hashText } from './embedding_utils.mjs';

const url = getDatabaseUrl();
const MODEL = 'Xenova/all-MiniLM-L6-v2';

async function main() {
    console.log(`Loading Xenova pipeline for canonical model: ${MODEL}...`);
    const { pipeline } = await import('@xenova/transformers');
    const embedder = await pipeline('feature-extraction', MODEL);
    console.log('✅ Model loaded successfully!\n');

    const client = new pg.Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
    });
    await client.connect();

    try {
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding_hash text`);
        const { rows: countRows } = await client.query('SELECT count(*) as total FROM products WHERE is_deleted = false');
        const totalProducts = parseInt(countRows[0].total, 10);
        console.log(`Starting unified re-indexing for ${totalProducts} active products with embedding_hash...`);

        let lastId = '';
        let processed = 0;
        const BATCH_SIZE = 50;

        while (true) {
            const query = `
                SELECT p.id, p.name, p.name_uz, p.name_ru, p.description, p.description_uz, p.description_ru, 
                       p.model, p.article, p.image_metadata, p.ai_persona, c.name AS category_name 
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.is_deleted = false AND p.embedding_hash IS NULL
                LIMIT $1
            `;
            const { rows: batch } = await client.query(query, [BATCH_SIZE]);
            if (batch.length === 0) break;

            for (const p of batch) {
                const searchBlob = buildEmbeddingText(p);
                const h = hashText(searchBlob);

                const output = await embedder(searchBlob, { pooling: 'mean', normalize: true });
                const vectorStr = `[${Array.from(output.data).join(',')}]`;

                await client.query('UPDATE products SET embedding = $1::vector, embedding_hash = $2 WHERE id = $3', [vectorStr, h, p.id]);
                processed++;
            }

            lastId = batch[batch.length - 1].id;
            console.log(`✅ Progress: ${processed} / ${totalProducts} products indexed with embedding_hash`);
        }

        const verifyResult = await client.query('SELECT count(*) as total, count(embedding) as with_embedding, count(embedding_hash) as with_hash FROM products WHERE is_deleted = false');
        console.log('\n=== RE-INDEXING COMPLETE ===');
        console.table(verifyResult.rows);
    } catch (err) {
        console.error('Re-indexing error:', err);
    } finally {
        await client.end();
    }
}

main();
