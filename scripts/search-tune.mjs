// smart_search_v2 ni sinov to'plamida sozlash (TASK Q, 3.4). Bazaga YOZMAYDI: funksiya nusxasi
// tranzaksiya ichida yaratiladi, o'lchanadi va ROLLBACK qilinadi. Qaror mantiqi route bilan bir xil
// (src/lib/search-pipeline.ts).
//
//   node --experimental-strip-types scripts/search-tune.mjs [--fuzzy 0.35,0.4] [--sem 0.62,0.66] [--ai] [--verbose]
//   --ai      : so'rov embedding'i (gemini-embedding-001) bilan; mahsulot vektori --col ustunidan
//   --col X   : embedding (standart) yoki embedding_next (almashtirishdan oldin)

import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl, readEnvFileKey } from './get_db_url.mjs';
import { TEXT_SET, productText, isRel } from './search-eval.mjs';
import { expandQuery, cleanSearchText } from '../src/lib/query-normalize.ts';
import { runTextSearch, FUZZY_THRESHOLD, SEMANTIC_THRESHOLD } from '../src/lib/search-pipeline.ts';

const args = process.argv.slice(2);
const list = (flag, def) => (args.includes(flag) ? args[args.indexOf(flag) + 1].split(',').map(Number) : def);
const FUZZY = list('--fuzzy', [FUZZY_THRESHOLD]);
const SEM = list('--sem', [SEMANTIC_THRESHOLD]);
const AI = args.includes('--ai');
const COL = args.includes('--col') ? args[args.indexOf('--col') + 1] : 'embedding';
const VERBOSE = args.includes('--verbose');

// So'rov embedding'lari lokal keshlanadi (API kvotasini tejash)
const QCACHE = 'scripts/.embed-cache/query-gemini-embedding-001.json';
fs.mkdirSync('scripts/.embed-cache', { recursive: true });
const qcache = fs.existsSync(QCACHE) ? JSON.parse(fs.readFileSync(QCACHE, 'utf8')) : {};
const KEYS = [...new Set(['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY'].map(readEnvFileKey).filter(Boolean))];
async function queryEmbedding(q) {
    if (qcache[q]) return qcache[q];
    for (let a = 0; a < 6; a++) {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEYS[a % KEYS.length] },
            body: JSON.stringify({ content: { parts: [{ text: q }] }, taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 }),
        });
        const d = await res.json();
        if (d.embedding) {
            const n = Math.sqrt(d.embedding.values.reduce((s, x) => s + x * x, 0));
            qcache[q] = `[${d.embedding.values.map(x => x / n).join(',')}]`;
            fs.writeFileSync(QCACHE, JSON.stringify(qcache));
            return qcache[q];
        }
        await new Promise(r => setTimeout(r, 15000));
    }
    return null;
}

const db = new pg.Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
await db.connect();
await db.query('BEGIN');
try {
    // Funksiya nusxasi: smart_search_tune (mahsulot vektori — COL ustunidan)
    let sql = fs.readFileSync('scripts/migrations/2026-09-search-v2.sql', 'utf8');
    sql = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.smart_search_v2('), sql.indexOf('-- "Balki shuni'))
        .replace('public.smart_search_v2(', 'public.smart_search_tune(')
        .replace('p.price, p.old_price, p.created_at, p.avg_rating, p.sales, p.embedding,', `p.price, p.old_price, p.created_at, p.avg_rating, p.sales, p.${COL} AS embedding,`);
    if (!sql.includes(`p.${COL} AS embedding`)) throw new Error('funksiya nusxasi: embedding ustuni almashtirilmadi');
    await db.query(sql);

    const syn = Object.fromEntries((await db.query(`select lower(keyword) k, maps_to v from search_synonyms`)).rows.map(r => [r.k, r.v]));
    const cats = new Map((await db.query(`select id, name, name_uz, name_ru from categories`)).rows.map(c => [String(c.id), c]));
    const prods = new Map((await db.query(`select id, name, name_uz, name_ru, model, category_id from products`)).rows.map(p => [String(p.id), p]));
    const before = JSON.parse(fs.readFileSync('scripts/search-eval-before.json', 'utf8')).text;
    const gtOf = (q) => before.find(x => x.q === q)?.gt ?? 0;

    for (const fuzzy of FUZZY) for (const sem of SEM) {
        const rows = [];
        for (const [q, group, rules] of TEXT_SET) {
            const groups = expandQuery(q, syn);
            const raw = cleanSearchText(q);
            const rpc = async ({ need, embedding }) => (await db.query(
                `select smart_search_tune($1::jsonb, $2, $3, $4, $5::vector, $6, null, null, null, null, null, null, 0, 5, null) r`,
                [JSON.stringify(groups), raw, need, fuzzy, embedding, sem])).rows[0].r;
            const { result: r, usedAI, isFallback } = await runTextSearch(groups.length, rpc, AI ? () => queryEmbedding(raw) : async () => null);
            const top = r.items.map(it => ({ ...it, rel: isRel(productText(prods.get(String(it.id)), cats), rules), name: (prods.get(String(it.id))?.name_uz || '').slice(0, 42) }));
            rows.push({ q, group, gt: gtOf(q), total: r.total, rel5: top.filter(x => x.rel).length, n5: top.length, usedAI, isFallback, top });
        }
        const withGt = rows.filter(x => x.gt > 0), noGt = rows.filter(x => x.gt === 0);
        const p5 = withGt.reduce((s, x) => s + (x.n5 ? x.rel5 / x.n5 : 0), 0) / withGt.length;
        console.log(`\nfuzzy=${fuzzy} sem=${sem}${AI ? ' +AI' : ''}: P@5=${p5.toFixed(3)} found=${withGt.filter(x => x.rel5 > 0).length}/${withGt.length}  gt=0 da toza=${noGt.filter(x => x.total === 0).length}/${noGt.length} shovqin=${noGt.reduce((s, x) => s + x.total, 0)} (yumshatilgansiz: ${noGt.filter(x => !x.isFallback).reduce((s, x) => s + x.total, 0)})  AI ishlatildi: ${rows.filter(x => x.usedAI).length}`);
        if (VERBOSE) for (const x of rows) console.log(`  ${x.group.padEnd(6)} ${x.q.padEnd(24)} gt=${String(x.gt).padStart(3)} total=${String(x.total).padStart(3)} rel5=${x.rel5}/${x.n5}${x.usedAI ? ' AI' : ''}${x.isFallback ? ' (yumshatilgan)' : ''}  ${x.top.slice(0, 3).map(t => (t.rel ? '+' : '-') + t.name + (t.sem != null ? `(${t.sem})` : '')).join(' | ')}`);
    }
    const dym = [];
    for (const q of ['dayson', 'daysin', 'tarozi', 'epilyatr', 'trimer', 'kalonka', 'fen', 'arpods', 'hijab', 'epilyator']) {
        dym.push(`${q} → ${(await db.query(`select search_did_you_mean($1::text[]) d`, [cleanSearchText(q).split(' ')])).rows[0].d}`);
    }
    console.log('\nsearch_did_you_mean:', dym.join(' | '));
} finally {
    await db.query('ROLLBACK');
    await db.end();
}
