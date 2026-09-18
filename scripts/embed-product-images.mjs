// Mahsulot rasmlari uchun multimodal vektor generatori (Image-to-Image vizual qidiruv).
// Google Gemini Embedding 2 orqali har bir tovar rasmini 768-o'lchamli vektorga aylantiradi.
// 2 yoki undan ortiq PRO API kalitlari bilan parallel va navbatma-navbat (Round-Robin) ishlaydi.
//
// Ishlatish:
//   NODE_PATH=/root/node_modules node scripts/embed-product-images.mjs
//   NODE_PATH=/root/node_modules node scripts/embed-product-images.mjs --force
//   NODE_PATH=/root/node_modules node scripts/embed-product-images.mjs --limit 10

import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pg;
try {
    pg = require('pg');
} catch {
    pg = require('/root/node_modules/pg');
}

// 1. Env fayldan kalitlarni o'qish
function loadEnv() {
    const envPath = '.env';
    if (!existsSync(envPath)) return {};
    const text = readFileSync(envPath, 'utf8');
    const res = {};
    for (const line of text.split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m) res[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return res;
}

const env = loadEnv();
const DATABASE_URL = env.DATABASE_URL;

// API Kalitlar ro'yxati (Avtomatik round-robin)
const rawKeys = [
    env.GEMINI_API_KEY_1,
    env.GEMINI_API_KEY_2,
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_3,
].filter(Boolean);
const API_KEYS = [...new Set(rawKeys)];

if (API_KEYS.length === 0) {
    console.error("❌ Xatolik: Hech qanday GEMINI_API_KEY topilmadi!");
    process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null;

let currentKeyIndex = 0;
function getNextApiKey() {
    const key = API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return key;
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Rasmni yuklab olib, Gemini Embedding 2 orqali 768-d vektor olish
async function generateImageEmbedding(imageUrl, retryCount = 0) {
    try {
        // Rasmni yuklab olish
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
        if (!imgRes.ok) throw new Error(`Rasmni yuklab bo'lmadi: ${imgRes.status}`);
        const arrayBuf = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        const mime = imgRes.headers.get('content-type') || 'image/jpeg';
        const cleanMime = mime.startsWith('image/') ? mime.split(';')[0] : 'image/jpeg';

        const apiKey = getNextApiKey();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/gemini-embedding-2',
                content: {
                    parts: [{ inline_data: { mime_type: cleanMime, data: base64 } }]
                },
                outputDimensionality: 768
            }),
            signal: AbortSignal.timeout(20000)
        });

        const data = await res.json();

        // 429 Rate limit kelsa kutib qayta urinish
        if (res.status === 429 || data.error?.code === 429) {
            if (retryCount < 4) {
                console.warn(`⚠️ Rate limit (429) uchradi, 3 soniya kutib qayta urinamiz... (Urinish: ${retryCount + 1})`);
                await sleep(3000);
                return generateImageEmbedding(imageUrl, retryCount + 1);
            }
            throw new Error(`Gemini rate limit: ${data.error?.message || '429'}`);
        }

        if (!data.embedding?.values) {
            throw new Error(`Embedding topilmadi: ${JSON.stringify(data.error || data)}`);
        }

        return data.embedding.values;
    } catch (err) {
        if (retryCount < 2) {
            await sleep(2000);
            return generateImageEmbedding(imageUrl, retryCount + 1);
        }
        throw err;
    }
}

async function main() {
    console.log(`\n🚀 Multimodal Image Embedding jarayoni boshlandi!`);
    console.log(`🔑 Faol Gemini API kalitlari soni: ${API_KEYS.length} ta`);

    const client = new pg.Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const condition = FORCE ? '' : 'AND image_embedding IS NULL';
    const limitClause = LIMIT ? `LIMIT ${LIMIT}` : '';

    const { rows } = await client.query(`
        SELECT id, name, image 
        FROM products 
        WHERE is_deleted = false 
          AND image IS NOT NULL 
          ${condition}
        ORDER BY sales DESC NULLS LAST
        ${limitClause};
    `);

    console.log(`📦 Vektorlashtirilishi kerak bo'lgan tovarlar soni: ${rows.length} ta\n`);

    if (rows.length === 0) {
        console.log(`✅ Barcha tovarlar allaqachon vektorlashtirilgan!`);
        await client.end();
        return;
    }

    let success = 0;
    let failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < rows.length; i++) {
        const p = rows[i];
        const num = i + 1;
        const shortName = p.name ? p.name.slice(0, 35) : p.id;

        try {
            process.stdout.write(`[${num}/${rows.length}] "${shortName}..." `);
            const vector = await generateImageEmbedding(p.image);
            const vectorLiteral = `[${vector.join(',')}]`;

            await client.query(
                `UPDATE products SET image_embedding = $1 WHERE id = $2;`,
                [vectorLiteral, p.id]
            );

            success++;
            process.stdout.write(`✅ 768-d saqlandi\n`);

            // Pro hisoblar tezkor bo'lgani uchun 350-500ms yengil pauza
            await sleep(400);
        } catch (err) {
            failed++;
            process.stdout.write(`❌ Xatolik: ${err.message}\n`);
            await sleep(1000);
        }
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n🎉 Jarayon yakunlandi!`);
    console.log(`⏱ Sarflangan vaqt: ${Math.floor(durationSec / 60)} daqiqa ${durationSec % 60} soniya`);
    console.log(`✅ Muvaffaqiyatli: ${success} ta`);
    if (failed > 0) console.log(`⚠️ Xatolar: ${failed} ta`);

    await client.end();
}

main().catch(err => {
    console.error("FATAL:", err);
    process.exit(1);
});
