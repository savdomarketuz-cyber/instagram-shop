// Mahsulot embedding generatori (semantik vektor qidiruv uchun).
//
// Har mahsulot matnini (nom uz/ru + ai_persona + kategoriya + tavsif) 384-o'lchovli
// multilingual MiniLM vektoriga aylantirib, products.embedding (pgvector) ustuniga yozadi.
// Model LOKAL ishlaydi (@xenova/transformers) — API/kalit kerak emas, bepul.
//
// Ishlatish:
//   node scripts/embed-products.mjs            faqat embedding YO'Q mahsulotlar (yangi/sync)
//   node scripts/embed-products.mjs --force    hammasini qayta hisoblash
//   node scripts/embed-products.mjs --limit 20 test uchun cheklov
//
// Yangi mahsulot qo'shilganda bayroqsiz qayta ishga tushiring (faqat bo'shlarini to'ldiradi).

import { readFileSync } from 'fs';
import pg from 'pg';
import { pipeline } from '@xenova/transformers';

const env = readFileSync('.env.local', 'utf8');
const pick = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
const DATABASE_URL = pick('DATABASE_URL');
if (!DATABASE_URL) { console.error('❌ DATABASE_URL topilmadi'); process.exit(1); }

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

const MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const BATCH = 16;

function parsePersona(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return null; } }
    return raw;
}

// Mahsulotning embedding matni — qidiruv/o'xshashlik uchun ma'noli, ko'p tilli.
function buildText(p) {
    const persona = parsePersona(p.ai_persona);
    const parts = [
        p.name_uz || p.name || '',
        p.name_ru || '',
        p.category_name || '',
    ];
    if (persona) {
        parts.push((persona.personas || []).join(', '));
        parts.push((persona.use_cases || []).join(', '));
        parts.push((persona.value_props || []).join(', '));
        parts.push((persona.search_terms || []).join(', '));
        parts.push(persona.one_liner_uz || '');
        parts.push(persona.one_liner_ru || '');
    }
    const desc = (p.description_uz || p.description || '').toString();
    if (desc) parts.push(desc.slice(0, 400));
    return parts.filter(Boolean).join('. ').slice(0, 2000);
}

const toVectorLiteral = (arr) => '[' + arr.join(',') + ']';

async function main() {
    const c = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();

    const where = FORCE ? 'p.is_deleted = false' : 'p.is_deleted = false AND p.embedding IS NULL';
    const limitSql = LIMIT ? `LIMIT ${LIMIT}` : '';
    const { rows: products } = await c.query(`
        SELECT p.id, p.name, p.name_uz, p.name_ru, p.description, p.description_uz,
               p.ai_persona, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where}
        ORDER BY p.sales DESC NULLS LAST ${limitSql}
    `);

    if (products.length === 0) { console.log('✅ Hammasi tayyor — embedding yo\'q mahsulot topilmadi.'); await c.end(); return; }
    console.log(`📦 ${products.length} ta mahsulot uchun embedding hisoblanadi${FORCE ? ' (FORCE)' : ''}`);

    console.log('🔧 model yuklanmoqda (birinchi marta ~120MB)...');
    const ext = await pipeline('feature-extraction', MODEL);
    console.log('✅ model tayyor');

    let done = 0, failed = 0;
    for (let i = 0; i < products.length; i += BATCH) {
        const batch = products.slice(i, i + BATCH);
        const texts = batch.map(buildText);
        try {
            const out = await ext(texts, { pooling: 'mean', normalize: true });
            const D = 384;
            for (let j = 0; j < batch.length; j++) {
                const vec = Array.from(out.data).slice(j * D, (j + 1) * D);
                await c.query(
                    `UPDATE products SET embedding = $1::vector WHERE id = $2`,
                    [toVectorLiteral(vec), batch[j].id]
                );
                done++;
            }
            process.stdout.write(`\r✅ ${done}/${products.length}  (xato: ${failed})   `);
        } catch (e) {
            failed += batch.length;
            console.error(`\n⚠️  batch ${i}: ${e.message}`);
        }
    }
    console.log(`\n\n🎉 Tayyor: ${done} ta yozildi, ${failed} ta xato.`);
    await c.end();
}

main().catch(e => { console.error('❌ XATO:', e); process.exit(1); });
