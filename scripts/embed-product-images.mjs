// Mahsulot rasmlari embedding'i (rasm orqali qidiruv uchun).
//
// Model: Google gemini-embedding-2 (multimodal), 768 o'lcham -> product_image_embeddings.
// Har mahsulotdan 4 tagacha rasm: asosiy + galereyaning birinchi 3 tasi.
// Yuboriladigan fayl: image_metadata[url].lg (WEBP). AVIF HECH QACHON yuborilmaydi (Gemini qo'llamaydi):
// lg varianti bo'lmasa — faqat asl fayl jpeg/png/webp bo'lsa ishlatiladi, aks holda o'tkazib yuboriladi.
//
// Aqlli sync: har rasm uchun sha256(model + yuborilgan URL) saqlanadi —
//   yangi rasm / rasm almashtirilgan / model o'zgargan -> qayta hisoblanadi, o'zgarmagan -> tegilmaydi;
//   galereyadan olib tashlangan rasmlarning qatorlari o'chiriladi.
//
// Ishlatish:
//   node scripts/embed-product-images.mjs              yangi + o'zgargan
//   node scripts/embed-product-images.mjs --force      hammasi qayta
//   node scripts/embed-product-images.mjs --limit 10   birinchi 10 mahsulot (sinov)
// Kalitlar: GEMINI_API_KEY_1 / _2 / GEMINI_API_KEY (env yoki .env.local) — chop etilmaydi.

import pg from 'pg';
import { createHash } from 'crypto';
import { getDatabaseUrl, readEnvFileKey } from './get_db_url.mjs';

export const IMAGE_MODEL = 'gemini-embedding-2';
const DIM = 768;
const PER_PRODUCT = 4;
const OK_MIME = /^image\/(jpeg|png|webp)$/;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null;

const KEYS = [...new Set(['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY'].map(readEnvFileKey).filter(Boolean))];
if (!KEYS.length) { console.error('❌ GEMINI_API_KEY topilmadi (env yoki .env.local)'); process.exit(1); }
let keyIdx = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const normalize = (v) => { const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1; return v.map(x => x / n); };

/** Yuboriladigan URL: lg WEBP; bo'lmasa asl fayl (faqat jpeg/png/webp); AVIF — null. */
export function pickImageUrl(url, meta) {
    const lg = meta?.[url]?.lg;
    if (lg && /\.webp(\?|$)/i.test(lg)) return lg;
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(url)) return url;
    return null;
}

export function productImageUrls(p) {
    const list = [p.image, ...(p.images || [])].filter(Boolean);
    return [...new Set(list)].slice(0, PER_PRODUCT);
}

async function embedImage(url) {
    const imgRes = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!imgRes.ok) throw new Error(`rasm ${imgRes.status}`);
    const mime = (imgRes.headers.get('content-type') || '').split(';')[0].trim();
    if (!OK_MIME.test(mime)) throw new Error(`qo'llanmaydigan tur: ${mime || '?'}`);
    const data = Buffer.from(await imgRes.arrayBuffer()).toString('base64');

    for (let attempt = 0; ; attempt++) {
        const key = KEYS[keyIdx++ % KEYS.length];
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:embedContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({ content: { parts: [{ inline_data: { mime_type: mime, data } }] }, outputDimensionality: DIM }),
            signal: AbortSignal.timeout(30000),
        }).catch(e => ({ ok: false, status: 0, json: async () => ({ error: { message: e.message } }) }));
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.embedding?.values?.length === DIM) return normalize(body.embedding.values);
        if (attempt >= 5) throw new Error(`Gemini ${res.status}: ${body.error?.message || 'javob yo\'q'}`);
        await sleep(res.status === 429 ? 8000 * (attempt + 1) : 2000);
    }
}

// Uzoq jarayonda (≈1 soat) pooler ulanishni yopishi mumkin — uzilsa qayta ulanadi
let client = null;
async function connect() {
    // keepAlive + timeout: pooler ulanishni jimgina uzsa so'rov abadiy osilib qolmasin
    client = new pg.Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false }, keepAlive: true, query_timeout: 60000, connectionTimeoutMillis: 20000 });
    client.on('error', () => { client = null; });
    await client.connect();
}
const c = {
    async query(sql, params) {
        for (let attempt = 0; ; attempt++) {
            try {
                if (!client) await connect();
                return await client.query(sql, params);
            } catch (e) {
                const lost = /terminated|ECONNRESET|Connection|closed|timeout/i.test(e.message);
                if (!lost || attempt >= 3) throw e;
                try { await client?.end(); } catch {}
                client = null;
                await sleep(2000);
            }
        }
    },
    async end() { try { await client?.end(); } catch {} },
};

async function main() {

    const { rows: products } = await c.query(`
        -- image_metadata to'liq olinmaydi (blur base64 bilan juda katta) — faqat url → {lg} xaritasi
        SELECT id, name, image, images,
               (SELECT jsonb_object_agg(k, jsonb_build_object('lg', v->>'lg')) FROM jsonb_each(image_metadata) AS m(k, v)
                 WHERE jsonb_typeof(image_metadata) = 'object') AS image_metadata
        FROM products
        WHERE is_deleted = false AND image IS NOT NULL AND image <> ''
        ORDER BY sales DESC NULLS LAST ${LIMIT ? `LIMIT ${LIMIT}` : ''}`);
    const existing = new Map((await c.query(`SELECT product_id, position, url_hash FROM product_image_embeddings`)).rows
        .map(r => [`${r.product_id}:${r.position}`, r.url_hash]));

    const todo = [];
    let skippedAvif = 0;
    const keepIds = [], keepPos = [];
    for (const p of products) {
        const urls = productImageUrls(p);
        urls.forEach((u, pos) => {
            const send = pickImageUrl(u, p.image_metadata);
            if (!send) { skippedAvif++; return; }
            const h = sha(`${IMAGE_MODEL}\n${send}`);
            if (FORCE || existing.get(`${p.id}:${pos}`) !== h) todo.push({ id: p.id, pos, send, h, name: p.name });
        });
        keepIds.push(p.id);
        keepPos.push(urls.map((u, pos) => (pickImageUrl(u, p.image_metadata) ? pos : -1)).filter(x => x >= 0).join(','));
    }
    // galereyadan olib tashlangan / endi yuborib bo'lmaydigan rasmlar — bitta so'rovda
    const { rowCount: stale } = await c.query(`
        DELETE FROM product_image_embeddings e
        USING (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS keep) k
        WHERE e.product_id = k.id
          AND NOT (e.position = ANY(coalesce(string_to_array(nullif(k.keep, ''), ',')::smallint[], '{}'::smallint[])))`,
        [keepIds, keepPos]);
    console.log(`📦 ${products.length} ta mahsulot; embedding kerak: ${todo.length} ta rasm (${IMAGE_MODEL})${FORCE ? ' [FORCE]' : ''}`);
    if (skippedAvif) console.log(`ℹ️  ${skippedAvif} ta rasmda lg WEBP yo'q va asli AVIF/boshqa — o'tkazib yuborildi`);
    if (stale) console.log(`🧹 ${stale} ta eskirgan rasm qatori o'chirildi`);

    let done = 0, failed = 0;
    for (const t of todo) {
        try {
            const vec = await embedImage(t.send);
            await c.query(`
                INSERT INTO product_image_embeddings (product_id, position, image_url, url_hash, model, embedding, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6::vector, now())
                ON CONFLICT (product_id, position) DO UPDATE
                   SET image_url = EXCLUDED.image_url, url_hash = EXCLUDED.url_hash, model = EXCLUDED.model,
                       embedding = EXCLUDED.embedding, updated_at = now()`,
                [t.id, t.pos, t.send, t.h, IMAGE_MODEL, `[${vec.join(',')}]`]);
            done++;
        } catch (e) {
            failed++;
            console.error(`\n⚠️  ${(t.name || t.id).slice(0, 40)} #${t.pos}: ${e.message}`);
        }
        process.stdout.write(`\r✅ ${done}/${todo.length}  (xato: ${failed})   `);
        await sleep(150);
    }
    console.log(`\n🎉 Rasm embedding: ${done} ta yozildi, ${failed} ta xato.`);
    await c.end();
    if (failed) process.exitCode = 1;
}

main().catch(e => { console.error('❌ XATO:', e.message); process.exit(1); });
