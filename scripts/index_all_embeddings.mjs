import pg from 'pg';
import { getDatabaseUrl } from './get_db_url.mjs';

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
        const { rows: countRows } = await client.query('SELECT count(*) as total FROM products WHERE is_deleted = false');
        const totalProducts = parseInt(countRows[0].total, 10);
        console.log(`Starting full unified re-indexing for ${totalProducts} active products...`);

        let lastId = '';
        let processed = 0;
        const BATCH_SIZE = 50;

        while (true) {
            const query = lastId
                ? 'SELECT id, name, name_uz, name_ru, description, description_uz, description_ru, category_id, model, article, image_metadata FROM products WHERE is_deleted = false AND id > $1 ORDER BY id ASC LIMIT $2'
                : 'SELECT id, name, name_uz, name_ru, description, description_uz, description_ru, category_id, model, article, image_metadata FROM products WHERE is_deleted = false ORDER BY id ASC LIMIT $1';

            const params = lastId ? [lastId, BATCH_SIZE] : [BATCH_SIZE];
            const { rows: batch } = await client.query(query, params);

            if (batch.length === 0) break;

            for (const p of batch) {
                const visionMeta = p.image_metadata ? Object.values(p.image_metadata).map(m => (m.alt_uz || '') + ' ' + (m.alt_ru || '')).join(' ') : '';
                const searchBlob = `${p.name_uz || p.name || ''} ${p.name_ru || p.name || ''} ${p.model || ''} ${p.article || ''} ${visionMeta} ${(p.description_uz || p.description || '').slice(0, 300)}`.trim();

                const output = await embedder(searchBlob, { pooling: 'mean', normalize: true });
                const vectorStr = `[${Array.from(output.data).join(',')}]`;

                await client.query('UPDATE products SET embedding = $1 WHERE id = $2', [vectorStr, p.id]);
                processed++;
            }

            lastId = batch[batch.length - 1].id;
            console.log(`✅ Progress: ${processed} / ${totalProducts} products indexed with ${MODEL}`);
        }

        const verifyResult = await client.query('SELECT count(*) as total, count(embedding) as with_embedding FROM products WHERE is_deleted = false');
        console.log('\n=== RE-INDEXING COMPLETE ===');
        console.table(verifyResult.rows);
    } catch (err) {
        console.error('Re-indexing error:', err);
    } finally {
        await client.end();
    }
}

main();
