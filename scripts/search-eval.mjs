// Qidiruv sifatini o'lchash (TASK Q, 2- va 5-qism). Jonli /api/search'ga so'rov yuboradi.
//
//   node scripts/search-eval.mjs                 matnli to'plam + rasm sinovi
//   node scripts/search-eval.mjs --text          faqat matn
//   node scripts/search-eval.mjs --image         faqat rasm
//   node scripts/search-eval.mjs --out before    natija: scripts/search-eval-before.json
//   BASE=https://preview-url node scripts/search-eval.mjs
//
// BAHOLASH QOIDASI
//   Har so'rovga "niyat" qoidasi (intent) yozilgan: mahsulot matni (nom uz/ru/asl, model,
//   kategoriya uz/ru) shu regex'larning HAMMASIGA mos kelsa — natija TO'G'RI.
//   gt   = ombordagi (stokda bor) to'g'ri mahsulotlar soni (shu qoida bilan bazadan sanaladi)
//   gt>0 : top5 dan nechtasi to'g'ri (rel@5), P@5 = rel@5 / min(5, natija soni)
//   gt=0 : omborda mos tovar yo'q — ideal javob 0 natija; qaytgan natijalar "shovqin"
//   Rasm: mahsulotning o'z asosiy rasmi (image_metadata lg WEBP) yuboriladi — o'sha
//   mahsulot birinchi 3 tada bo'lsa — o'tdi.
//
// Sinovdan keyin shu skript yuborgan so'rovlar search_analytics'dan o'chiriladi.

import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl } from './get_db_url.mjs';

const BASE = process.env.BASE || 'https://velari.uz';
const args = process.argv.slice(2);
const ONLY_TEXT = args.includes('--text');
const ONLY_IMAGE = args.includes('--image');
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;

const R = (s) => new RegExp(s, 'i');
const FEN = R('(^|[^a-z])fen|фен');
const TRIM = R('trimmer|триммер|clipper|klipper|mashinka|машинк|soch olish');
const AIRPODS = R('airpods|pods|quloqchin|наушник|naushnik|tws');
const SUMKA = R('sumk|сумк|рюкзак|ryukzak|ryugzak|bag');
// "Styler" — M.A.C STYLER brend nomi ham; shuning uchun faqat kategoriya/tur so'zlari
const DYSON = R('dyson|дайсон|airwrap|fen-shotk|фен-щетк|turmaklash|стайлер');
const KOSM = R('kosmetik|косметик|makiyaj|pomad|помад|blesk|блеск|atir|парфюм|krem|крем');

// [so'rov, guruh, [niyat regex'lari]]  (guruh: top | multi | zero | golden)
export const TEXT_SET = [
    ['tarozi', 'top', [R('taroz|весы|vesy')]],
    ['sumka', 'top', [SUMKA]],
    ['telefon', 'top', [R('smartfon|смартфон|telefon|телефон|iphone|samsung|xiaomi')]],
    ['dayson', 'top', [DYSON]],
    ['daysin', 'top', [DYSON]],
    ['vgr', 'top', [R('\\bvgr\\b')]],
    ['kiyim', 'top', [R('kiyim|одежд|ko.ylak|kofta|shim|yupka|футбол|плать')]],
    ['iphone', 'top', [R('iphone|айфон')]],
    ['rolik', 'top', [R('rolik|ролик|roller')]],
    ['kiyimlar', 'top', [R('kiyim|одежд|ko.ylak|kofta|shim|yupka|футбол|плать')]],
    ['fen', 'top', [FEN]],
    ['kosmetika', 'top', [KOSM]],
    ['planshet', 'top', [R('planshet|планшет|ipad|tablet')]],
    ['dyson', 'top', [DYSON]],
    ['airpods', 'top', [AIRPODS]],
    ['ipad', 'top', [R('ipad|planshet|планшет')]],
    ['bleck', 'top', [R('blesk|блеск|gloss')]],
    ['atir', 'top', [R('atir|парфюм|духи|parfum')]],
    ['kasmetika', 'top', [KOSM]],
    ['pamada', 'top', [R('pomad|помад|pamad|lipstick')]],

    ['qora fen', 'multi', [FEN, R('qora|черн|black')]],
    ['soch dazmoli', 'multi', [R('dazmol|выпрямит|утюжок')]],
    ['burun trimmer', 'multi', [TRIM, R('burun|нос|nose')]],
    ['epilyator yuz uchun', 'multi', [R('epil|эпил'), R('yuz|лиц|face')]],
    ['fen shotka', 'multi', [R('fen-shotk|фен-щетк|shotka|щетк')]],
    ['vgr soqol trimmer', 'multi', [R('\\bvgr\\b'), TRIM]],
    ['oq kofta', 'multi', [R('kofta|кофт'), R('(^|\\s)oq|бел|white')]],
    ['maktab uchun sumka', 'multi', [SUMKA]],
    ['elektro velosiped', 'multi', [R('velosiped|велосипед')]],
    ['bioaqua amino acid', 'multi', [R('bioaqua')]],

    ['aksesuar', 'zero', [R('aksessuar|аксессуар|shtativ|штатив|tripod')]],
    ['achki', 'zero', [R('ko.zoynak|очк|ochki')]],
    ['ryugzak', 'zero', [R('ryukzak|рюкзак|ryugzak')]],
    ['𝐔𝐳𝐮𝐤𝐥𝐚𝐫', 'zero', [R('uzuk|кольц')]],
    ['acses', 'zero', [R('aksessuar|аксессуар|shtativ|штатив|tripod')]],
    ['𝐓𝐚𝐫𝐨𝐳𝐢', 'zero', [R('taroz|весы')]],
    ['epilyator', 'zero', [R('epil|эпил')]],
    ['hijab', 'zero', [R('hijob|hijab|хиджаб|ro.mol')]],
    ['kõylakk', 'zero', [R('ko.ylak|koylak|платье|рубашк')]],
    ['airpos', 'zero', [AIRPODS]],

    ['vgr v-097', 'golden', [R('v-?097')]],
    ['arpods', 'golden', [AIRPODS]],
    ['airpods max', 'golden', [AIRPODS]],
    ['триммер', 'golden', [TRIM]],
    ['soch olish mashinkasi', 'golden', [TRIM]],
    ['naushnik', 'golden', [AIRPODS]],
    ['klipper', 'golden', [TRIM]],
    ['xyznonexistentqueryqwerty', 'golden', [R('^$a')]],
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function productText(p, cats) {
    const c = cats.get(String(p.category_id)) || {};
    return [p.name, p.name_uz, p.name_ru, p.model, c.name, c.name_uz, c.name_ru].filter(Boolean).join(' | ').toLowerCase();
}
const isRel = (text, rules) => rules.every(r => r.test(text));

async function post(body) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ms: Date.now() - t0, data };
}

async function main() {
    const db = new pg.Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
    await db.connect();
    const cats = new Map((await db.query(`select id, name, name_uz, name_ru from categories`)).rows.map(c => [String(c.id), c]));
    const stock = (await db.query(`select id, name, name_uz, name_ru, model, category_id, image, image_metadata, sales
        from products where is_deleted = false and get_product_stock(stock, stock_details) > 0`)).rows;
    const byId = new Map(stock.map(p => [String(p.id), p]));
    const sent = [];
    const out = { base: BASE, at: new Date().toISOString(), text: [], image: [] };

    if (!ONLY_IMAGE) {
        console.log(`\n=== MATN (${TEXT_SET.length} so'rov) — ${BASE}`);
        for (const [q, group, rules] of TEXT_SET) {
            const gt = stock.filter(p => isRel(productText(p, cats), rules)).length;
            const r = await post({ query: q });
            sent.push(q);
            const results = r.data.results || [];
            const top5 = results.slice(0, 5).map(p => {
                const full = byId.get(String(p.id)) || p;
                return { id: p.id, name: (p.name_uz || p.name || '').slice(0, 60), rel: isRel(productText(full, cats), rules) };
            });
            const rel5 = top5.filter(x => x.rel).length;
            const row = { q, group, gt, n: results.length, rel5, p5: top5.length ? rel5 / top5.length : null,
                isFallback: !!r.data.isFallback, didYouMean: r.data.didYouMean || null, status: r.status, ms: r.ms, top5 };
            out.text.push(row);
            const verdict = gt > 0 ? `rel@5=${rel5}/${top5.length}` : (results.length === 0 ? 'OK (0)' : `SHOVQIN ${results.length}`);
            console.log(`${group.padEnd(6)} ${q.padEnd(26)} gt=${String(gt).padStart(3)} n=${String(results.length).padStart(3)} ${verdict.padEnd(14)} ${r.ms}ms ${r.status !== 200 ? 'HTTP ' + r.status : ''}${row.didYouMean ? ' dym=' + row.didYouMean : ''}`);
            await sleep(1100); // /api/search: 60 so'rov/daqiqa/IP
        }
        const withGt = out.text.filter(x => x.gt > 0), noGt = out.text.filter(x => x.gt === 0);
        const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
        out.textSummary = {
            withInventory: withGt.length,
            meanP5: +mean(withGt.map(x => x.p5 ?? 0)).toFixed(3),
            found: withGt.filter(x => x.rel5 > 0).length,
            noInventory: noGt.length,
            noInventoryClean: noGt.filter(x => x.n === 0).length,
            noiseResults: noGt.reduce((s, x) => s + x.n, 0),
        };
        console.log('\nMATN XULOSA:', out.textSummary);
    }

    if (!ONLY_TEXT) {
        // 10 ta mahsulot: har kategoriyadan eng ko'p sotilgani, lg WEBP varianti bor bo'lsa
        const picked = [], seenCat = new Set();
        const lgOf = (p) => p.image_metadata?.[p.image]?.lg;
        for (const p of [...stock].sort((a, b) => (b.sales || 0) - (a.sales || 0))) {
            if (picked.length >= 10) break;
            if (!lgOf(p) || seenCat.has(p.category_id)) continue;
            seenCat.add(p.category_id); picked.push(p);
        }
        for (const p of [...stock].sort((a, b) => (b.sales || 0) - (a.sales || 0))) {
            if (picked.length >= 10) break;
            if (lgOf(p) && !picked.includes(p)) picked.push(p);
        }
        console.log(`\n=== RASM (${picked.length} mahsulot, o'z lg WEBP rasmi)`);
        for (const p of picked) {
            const url = lgOf(p);
            const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
            const r = await post({ image: `data:image/webp;base64,${buf.toString('base64')}`, limit: 20 });
            const ids = (r.data.results || []).map(x => String(x.id));
            const rank = ids.indexOf(String(p.id)) + 1;
            out.image.push({ id: p.id, name: (p.name_uz || p.name).slice(0, 50), kb: Math.round(buf.length / 1024), rank, n: ids.length, status: r.status, ms: r.ms });
            console.log(`${rank >= 1 && rank <= 3 ? 'OK  ' : 'FAIL'} rank=${rank || '-'} n=${ids.length} ${Math.round(buf.length / 1024)}KB ${r.ms}ms ${(p.name_uz || p.name).slice(0, 50)}${r.status !== 200 ? ' HTTP ' + r.status : ''}`);
            await sleep(2000);
        }
        out.imageSummary = { total: out.image.length, top3: out.image.filter(x => x.rank >= 1 && x.rank <= 3).length };
        console.log('\nRASM XULOSA:', out.imageSummary);
    }

    // Sinov so'rovlarini statistikadan olib tashlash (faqat shu yerda yuborilganlar, eng yangilari)
    let removed = 0;
    for (const q of sent) {
        const r = await db.query(`delete from search_analytics where id in (
            select id from search_analytics where query = $1 and user_phone is null and created_at >= $2
            order by created_at desc limit 1)`, [q, out.at]);
        removed += r.rowCount;
    }
    console.log(`\nsearch_analytics: ${removed}/${sent.length} sinov yozuvi o'chirildi`);

    if (OUT) {
        const f = `scripts/search-eval-${OUT}.json`;
        fs.writeFileSync(f, JSON.stringify(out, null, 1));
        console.log(`-> ${f}`);
    }
    await db.end();
}

main().catch(e => { console.error('XATO:', e); process.exit(1); });
