// Mahsulot embedding generatori (semantik vektor qidiruv uchun).
//
// Har mahsulot matnini (nom uz/ru + ai_persona + kategoriya + tavsif) 384-o'lchovli
// multilingual MiniLM vektoriga aylantirib, products.embedding (pgvector) ustuniga yozadi.
// Model LOKAL ishlaydi (@xenova/transformers) — API/kalit kerak emas, bepul.
//
// Aqlli sync: matndan "barmoq izi" (sha256 hash) saqlanadi (embedding_hash).
//   - YANGI mahsulot (embedding yo'q)        -> embedding qilinadi
//   - TAHRIRLANGAN (matn o'zgargan, hash farq) -> qayta embedding qilinadi
//   - o'zgarmagan                              -> tegilmaydi (tez, bekorga ishlamaydi)
//   (Faqat narx/qoldiq o'zgarsa matn o'zgarmaydi -> bekorga qayta qilmaymiz.)
//
// Ishlatish:
//   node scripts/embed-products.mjs            yangi + tahrirlangan mahsulotlar
//   node scripts/embed-products.mjs --force    hammasini qayta hisoblash
//   node scripts/embed-products.mjs --limit 20 test uchun cheklov

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import pg from 'pg';
import { pipeline } from '@xenova/transformers';
import { getDatabaseUrl } from './get_db_url.mjs';
import { buildEmbeddingText, hashText, toVectorLiteral } from './embedding_utils.mjs';

const DATABASE_URL = getDatabaseUrl();

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const BATCH = 16;

async function main() {
    const c = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();

    // embedding matnining "barmoq izi" — tahrirni aniqlash uchun (additive, xavfsiz)
    await c.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding_hash text`);

    const limitSql = LIMIT ? `LIMIT ${LIMIT}` : '';
    const { rows } = await c.query(`
        SELECT p.id, p.name, p.name_uz, p.name_ru, p.description, p.description_uz,
               p.model, p.article, p.image_metadata,
               p.ai_persona, c.name AS category_name,
               (p.embedding IS NOT NULL) AS has_emb, p.embedding_hash
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_deleted = false
        ORDER BY p.sales DESC NULLS LAST ${limitSql}
    `);

    const toEmbed = [];
    let stamped = 0;
    for (const p of rows) {
        const text = buildEmbeddingText(p);
        const h = hashText(text);
        p._text = text; p._hash = h;

        if (FORCE) { toEmbed.push(p); continue; }
        if (!p.has_emb) { toEmbed.push(p); continue; }              // yangi mahsulot
        if (p.embedding_hash == null) {                              // eski (hash hali yo'q) — mavjud embedding to'g'ri deb hash belgilaymiz
            await c.query(`UPDATE products SET embedding_hash = $1 WHERE id = $2`, [h, p.id]);
            stamped++; continue;
        }
        if (p.embedding_hash !== h) { toEmbed.push(p); continue; }   // tahrirlangan — matn o'zgargan
        // aks holda: o'zgarmagan -> skip
    }

    if (stamped) console.log(`ℹ️  ${stamped} ta mavjud mahsulotga hash belgilandi (qayta embedding shart emas).`);

    if (toEmbed.length === 0) {
        console.log('✅ Hammasi tayyor — yangi yoki tahrirlangan mahsulot yo\'q.');
        await c.end(); return;
    }
    console.log(`📦 ${toEmbed.length} ta mahsulot embedding qilinadi (yangi + tahrirlangan)${FORCE ? ' (FORCE)' : ''}`);

    console.log('🔧 model yuklanmoqda (birinchi marta ~120MB)...');
    const ext = await pipeline('feature-extraction', MODEL);
    console.log('✅ model tayyor');

    let done = 0, failed = 0;
    for (let i = 0; i < toEmbed.length; i += BATCH) {
        const batch = toEmbed.slice(i, i + BATCH);
        const texts = batch.map(p => p._text);
        try {
            const out = await ext(texts, { pooling: 'mean', normalize: true });
            const D = 384;
            for (let j = 0; j < batch.length; j++) {
                const vec = Array.from(out.data).slice(j * D, (j + 1) * D);
                await c.query(
                    `UPDATE products SET embedding = $1::vector, embedding_hash = $2 WHERE id = $3`,
                    [toVectorLiteral(vec), batch[j]._hash, batch[j].id]
                );
                done++;
            }
            process.stdout.write(`\r✅ ${done}/${toEmbed.length}  (xato: ${failed})   `);
        } catch (e) {
            failed += batch.length;
            console.error(`\n⚠️  batch ${i}: ${e.message}`);
        }
    }
    console.log(`\n\n🎉 Tayyor: ${done} ta yozildi, ${failed} ta xato.`);
    await c.end();
}

main().catch(e => { console.error('❌ XATO:', e); process.exit(1); });
