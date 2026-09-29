// Mahsulot matn embedding'i (semantik qidiruv va "o'xshash mahsulotlar" uchun).
//
// Model: Google gemini-embedding-001, 768 o'lcham, RETRIEVAL_DOCUMENT (so'rov tomoni —
// src/lib/embeddings.ts, RETRIEVAL_QUERY). Model sinov to'plamida tanlangan:
// scripts/embed-model-compare.mjs. Native kutubxona kerak emas — istalgan kompyuterda ishlaydi.
//
// Aqlli sync: har mahsulot matnidan (nom uz/ru, model, artikul, kategoriya, ai_persona, tavsif)
// va model nomidan sha256 "barmoq izi" olinadi va <ustun>_hash ga yoziladi.
//   - embedding yo'q                  -> hisoblanadi
//   - matn yoki model o'zgargan       -> qayta hisoblanadi
//   - o'zgarmagan                     -> tegilmaydi
//
// Ishlatish:
//   node scripts/embed-products.mjs                        yangi + o'zgargan
//   node scripts/embed-products.mjs --force                hammasi qayta
//   node scripts/embed-products.mjs --limit 20             sinov
//   node scripts/embed-products.mjs --column embedding_next  (bir martalik o'tish, swap'dan oldin)
// Kalitlar: GEMINI_API_KEY_1 / _2 / GEMINI_API_KEY (env yoki .env.local) — chop etilmaydi.

import pg from 'pg';
import { getDatabaseUrl, readEnvFileKey } from './get_db_url.mjs';
import { buildEmbeddingText, hashText, toVectorLiteral } from './embedding_utils.mjs';

export const TEXT_MODEL = 'gemini-embedding-001';
const DIM = 768;
// Bepul tarifda token/daqiqa chegarasi bor: kichik batch + pauza (429 bo'lsa uzoqroq kutadi)
const BATCH = 20;
const PAUSE_MS = 4000;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null;
const COLUMN = args.includes('--column') ? args[args.indexOf('--column') + 1] : 'embedding';
if (!/^(embedding|embedding_next)$/.test(COLUMN)) { console.error('❌ --column: embedding yoki embedding_next'); process.exit(1); }
const HASH_COL = `${COLUMN}_hash`;

const KEYS = [...new Set(['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY'].map(readEnvFileKey).filter(Boolean))];
if (!KEYS.length) { console.error('❌ GEMINI_API_KEY topilmadi (env yoki .env.local)'); process.exit(1); }
let keyIdx = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const normalize = (v) => { const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1; return v.map(x => x / n); };

async function embedBatch(texts) {
    for (let attempt = 0; ; attempt++) {
        const key = KEYS[keyIdx++ % KEYS.length];
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:batchEmbedContents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
                requests: texts.map(t => ({ model: `models/${TEXT_MODEL}`, content: { parts: [{ text: t }] }, taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: DIM })),
            }),
            signal: AbortSignal.timeout(60000),
        }).catch(e => ({ ok: false, status: 0, json: async () => ({ error: { message: e.message } }) }));
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.embeddings)) return data.embeddings.map(e => normalize(e.values));
        if (attempt >= 6) throw new Error(`Gemini ${res.status}: ${data.error?.message || 'javob yo\'q'}`);
        const wait = res.status === 429 ? 30000 * (attempt + 1) : 3000;
        console.warn(`\n⚠️  ${res.status || 'tarmoq'} — ${wait / 1000}s kutib qayta urinamiz`);
        await sleep(wait);
    }
}

async function main() {
    const c = new pg.Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
    await c.connect();

    const { rows } = await c.query(`
        SELECT p.id, p.name, p.name_uz, p.name_ru, p.description, p.description_uz,
               p.model, p.article, p.image_metadata, p.ai_persona, c.name AS category_name,
               (p.${COLUMN} IS NOT NULL) AS has_emb, p.${HASH_COL} AS emb_hash
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_deleted = false
        ORDER BY p.sales DESC NULLS LAST
        ${LIMIT ? `LIMIT ${LIMIT}` : ''}`);

    const todo = [];
    for (const p of rows) {
        const text = buildEmbeddingText(p);
        const h = hashText(`${TEXT_MODEL}\n${text}`);
        if (FORCE || !p.has_emb || p.emb_hash !== h) todo.push({ id: p.id, text, h });
    }
    console.log(`📦 ${rows.length} ta faol mahsulot; embedding kerak: ${todo.length} ta (${TEXT_MODEL}, ustun: ${COLUMN})${FORCE ? ' [FORCE]' : ''}`);
    if (!todo.length) { console.log('✅ Hammasi tayyor.'); await c.end(); return; }

    let done = 0, failed = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
        const batch = todo.slice(i, i + BATCH);
        try {
            const vecs = await embedBatch(batch.map(b => b.text));
            const values = batch.map((b, j) => `($${j * 3 + 1}, $${j * 3 + 2}::vector, $${j * 3 + 3})`).join(',');
            const params = batch.flatMap((b, j) => [b.id, toVectorLiteral(vecs[j]), b.h]);
            await c.query(`UPDATE products p SET ${COLUMN} = v.e, ${HASH_COL} = v.h
                           FROM (VALUES ${values}) AS v(id, e, h) WHERE p.id = v.id`, params);
            done += batch.length;
        } catch (e) {
            failed += batch.length;
            console.error(`\n⚠️  ${i}-${i + batch.length}: ${e.message}`);
        }
        process.stdout.write(`\r✅ ${done}/${todo.length}  (xato: ${failed})   `);
        if (i + BATCH < todo.length) await sleep(PAUSE_MS);
    }
    console.log(`\n🎉 Matn embedding: ${done} ta yozildi, ${failed} ta xato.`);
    await c.end();
    if (failed) process.exitCode = 1;
}

main().catch(e => { console.error('❌ XATO:', e.message); process.exit(1); });
