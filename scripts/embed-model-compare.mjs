// Matn embedding modellarini sinov to'plamida solishtirish (TASK Q, 4.1).
// Faqat vektor bo'yicha tartiblash (trigram/bonuslarsiz) — model sifatini alohida ko'rsatadi.
//
//   node scripts/embed-model-compare.mjs
//
// Modellar: hozirgi all-MiniLM-L6-v2 (bazadagi vektorlar), paraphrase-multilingual-MiniLM-L12-v2,
// multilingual-e5-small (lokal), Gemini gemini-embedding-001 va gemini-embedding-2 (API).
// Mahsulot vektorlari scripts/.embed-cache/ ga keshlanadi (git'ga kirmaydi).

import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl } from './get_db_url.mjs';
import { buildEmbeddingText } from './embedding_utils.mjs';
import { TEXT_SET, productText, isRel } from './search-eval.mjs';

const CACHE = 'scripts/.embed-cache';
fs.mkdirSync(CACHE, { recursive: true });

function envKey(name) {
    if (process.env[name]) return process.env[name];
    for (const f of ['.env.local', '../.env.local', '.env']) {
        if (!fs.existsSync(f)) continue;
        const m = fs.readFileSync(f, 'utf8').match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'));
        if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
    return null;
}

const norm = (v) => { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s) || 1; return v.map(x => x / s); };
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

function localModel(id, { qPrefix = '', dPrefix = '' } = {}) {
    let ext = null;
    const run = async (texts) => {
        if (!ext) { const { pipeline } = await import('@xenova/transformers'); ext = await pipeline('feature-extraction', id); }
        const out = [];
        for (let i = 0; i < texts.length; i += 16) {
            const r = await ext(texts.slice(i, i + 16), { pooling: 'mean', normalize: true });
            const D = r.dims[r.dims.length - 1];
            for (let j = 0; j < r.dims[0]; j++) out.push(Array.from(r.data.slice(j * D, (j + 1) * D)));
            process.stdout.write(`\r  ${id}: ${out.length}/${texts.length}   `);
        }
        process.stdout.write('\n');
        return out;
    };
    return { id, docs: (t) => run(t.map(x => dPrefix + x)), queries: (t) => run(t.map(x => qPrefix + x)) };
}

function geminiModel(model) {
    const keys = [...new Set(['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY'].map(envKey).filter(Boolean))];
    let k = 0;
    const run = async (texts, taskType) => {
        const out = [];
        for (let i = 0; i < texts.length; i += 100) {
            const batch = texts.slice(i, i + 100);
            for (let attempt = 0; ; attempt++) {
                const key = keys[k++ % keys.length];
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                    body: JSON.stringify({ requests: batch.map(t => ({ model: `models/${model}`, content: { parts: [{ text: t }] }, taskType, outputDimensionality: 768 })) }),
                });
                const data = await res.json();
                if (res.ok) { out.push(...data.embeddings.map(e => norm(e.values))); break; }
                if (attempt >= 5) throw new Error(`${model}: ${res.status} ${data.error?.message}`);
                await new Promise(r => setTimeout(r, 4000 * (attempt + 1)));
            }
            process.stdout.write(`\r  ${model}: ${out.length}/${texts.length}   `);
        }
        process.stdout.write('\n');
        return out;
    };
    return { id: model, docs: (t) => run(t, 'RETRIEVAL_DOCUMENT'), queries: (t) => run(t, 'RETRIEVAL_QUERY') };
}

async function main() {
    const db = new pg.Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
    await db.connect();
    const cats = new Map((await db.query(`select id, name, name_uz, name_ru from categories`)).rows.map(c => [String(c.id), c]));
    const rows = (await db.query(`
        select p.id, p.name, p.name_uz, p.name_ru, p.description, p.description_uz, p.model, p.article,
               p.image_metadata, p.ai_persona, p.category_id, c.name as category_name, p.embedding::text as cur_emb
        from products p left join categories c on c.id = p.category_id
        where p.is_deleted = false and get_product_stock(p.stock, p.stock_details) > 0 order by p.id`)).rows;
    await db.end();
    const texts = rows.map(buildEmbeddingText);
    const queries = TEXT_SET.map(([q]) => q.normalize('NFKC').toLowerCase());
    const relMatrix = TEXT_SET.map(([, , rules]) => rows.map(p => isRel(productText(p, cats), rules)));
    console.log(`${rows.length} ta stokdagi mahsulot, ${queries.length} so'rov`);

    const models = [
        { id: 'current all-MiniLM-L6-v2', fromDb: true, q: localModel('Xenova/all-MiniLM-L6-v2') },
        { id: 'paraphrase-multilingual-MiniLM-L12-v2', m: localModel('Xenova/paraphrase-multilingual-MiniLM-L12-v2') },
        { id: 'multilingual-e5-small', m: localModel('Xenova/multilingual-e5-small', { qPrefix: 'query: ', dPrefix: 'passage: ' }) },
        { id: 'gemini-embedding-001', m: geminiModel('gemini-embedding-001') },
        { id: 'gemini-embedding-2', m: geminiModel('gemini-embedding-2') },
    ];

    const report = [];
    for (const M of models) {
        console.log(`\n== ${M.id}`);
        const f = `${CACHE}/${M.id.replace(/[^a-z0-9.-]+/gi, '_')}.json`;
        let docVecs;
        if (M.fromDb) docVecs = rows.map(r => JSON.parse(r.cur_emb));
        else if (fs.existsSync(f)) docVecs = JSON.parse(fs.readFileSync(f, 'utf8'));
        else { docVecs = await M.m.docs(texts); fs.writeFileSync(f, JSON.stringify(docVecs)); }
        const t0 = Date.now();
        const qVecs = await (M.fromDb ? M.q : M.m).queries(queries);
        const qMs = Math.round((Date.now() - t0) / queries.length);

        const per = [];
        TEXT_SET.forEach(([q, group], qi) => {
            const gt = relMatrix[qi].filter(Boolean).length;
            const scored = docVecs.map((d, i) => [dot(qVecs[qi], d), i]).sort((a, b) => b[0] - a[0]);
            const top5 = scored.slice(0, 5);
            const rel5 = top5.filter(([, i]) => relMatrix[qi][i]).length;
            const firstRel = scored.findIndex(([, i]) => relMatrix[qi][i]);
            per.push({ q, group, gt, rel5, rr: gt > 0 && firstRel >= 0 ? 1 / (firstRel + 1) : 0, top1: +top5[0][0].toFixed(3) });
        });
        const withGt = per.filter(x => x.gt > 0), noGt = per.filter(x => x.gt === 0);
        const avg = (a) => +(a.reduce((s, x) => s + x, 0) / (a.length || 1)).toFixed(3);
        const r = {
            model: M.id, P5: avg(withGt.map(x => x.rel5 / 5)), found5: withGt.filter(x => x.rel5 > 0).length + '/' + withGt.length,
            MRR: avg(withGt.map(x => x.rr)), top1_rel: avg(withGt.map(x => x.top1)), top1_norel: avg(noGt.map(x => x.top1)), queryMs: qMs,
        };
        r.gap = +(r.top1_rel - r.top1_norel).toFixed(3);
        report.push(r); console.log(r);
        fs.writeFileSync(`${CACHE}/per-${M.id.replace(/[^a-z0-9.-]+/gi, '_')}.json`, JSON.stringify(per, null, 1));
    }
    console.log('\n=== XULOSA (faqat vektor bo\'yicha tartib)');
    console.table(report);
}

main().catch(e => { console.error('XATO:', e); process.exit(1); });
