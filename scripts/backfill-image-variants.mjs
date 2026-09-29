// Mavjud admin rasmlari uchun variantlar (TASK P2c) — bir martalik, qayta ishga tushirish xavfsiz.
//
//   node --experimental-strip-types scripts/backfill-image-variants.mjs            (stories)
//   node --experimental-strip-types scripts/backfill-image-variants.mjs --dry      (faqat hisobot)
//
// - Jarayon: src/lib/image-variants.ts (yangi yuklashdagi bilan bir xil), S3: src/lib/s3-put.ts (immutable kesh).
// - Asl fayllar O'CHIRILMAYDI va o'zgartirilmaydi; variantlar yonida: <asl>_thumb/_xs/_md/_lg.webp.
// - Oldin backup: scripts/backups/<jadval>-image-meta-<vaqt>.json (id, image, image_meta).
// - Qayta ishga tushirilsa: image_meta.source === image bo'lgan yozuvlar o'tkazib yuboriladi;
//   S3'da variant allaqachon bo'lsa qayta yuklanmaydi.
// - image_meta shakli (kategoriya admin sahifasidagidek): { blurDataURL, lowResUrl, xs, md, lg, source }.

import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl, readEnvFileKey } from './get_db_url.mjs';
import { makeImageVariants } from '../src/lib/image-variants.ts';
import { putObject, s3Request } from '../src/lib/s3-put.ts';

const DRY = process.argv.includes('--dry');
const cfg = {
    accessKey: readEnvFileKey('YANDEX_S3_ACCESS_KEY') || '',
    secretKey: readEnvFileKey('YANDEX_S3_SECRET_KEY') || '',
    bucket: readEnvFileKey('YANDEX_S3_BUCKET') || 'savdomarketimag',
    region: readEnvFileKey('YANDEX_S3_REGION') || 'ru-central1',
};
if (!DRY && (!cfg.accessKey || !cfg.secretKey)) { console.error('❌ YANDEX_S3 kalitlari topilmadi (.env.local)'); process.exit(1); }
const PREFIX = `https://storage.yandexcloud.net/${cfg.bucket}/`;

// Kategoriyalar kiritilmagan: asl ikonkalar 1–3 KB (thumb undan katta, 360x480 kesim ikonkani qirqadi).
// Brendlar (1 ta logo) — jadvalda image_meta ustuni yo'q, sahifa birinchi ekranida emas.
const TABLES = [
    { table: 'stories', where: `coalesce(image,'') <> ''` },
];

const kb = (n) => Math.round(n / 1024);

async function existingUrl(key) {
    const r = await s3Request('HEAD', key, { config: cfg });
    return r.ok ? PREFIX + key : null;
}

async function main() {
    const db = new pg.Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
    await db.connect();
    fs.mkdirSync('scripts/backups', { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const report = [];

    for (const { table, where } of TABLES) {
        const rows = (await db.query(`select id, image, image_meta from ${table} where ${where} order by id`)).rows;
        fs.writeFileSync(`scripts/backups/${table}-image-meta-${stamp}.json`, JSON.stringify(rows, null, 1));
        let done = 0, skipped = 0, failed = 0, before = 0, thumbs = 0, lgs = 0;
        for (const r of rows) {
            if (r.image_meta?.source === r.image && r.image_meta?.lg) { skipped++; continue; }
            if (!r.image.startsWith(PREFIX)) { console.log(`  ⏭  ${table}/${r.id}: tashqi URL — o'tkazildi`); skipped++; continue; }
            try {
                const res = await fetch(r.image, { signal: AbortSignal.timeout(30000) });
                if (!res.ok) throw new Error(`asl rasm ${res.status}`);
                const src = Buffer.from(await res.arrayBuffer());
                const v = await makeImageVariants(src);
                const base = r.image.slice(PREFIX.length).replace(/\.[a-z0-9]+$/i, '');
                const put = async (buf, suffix) => {
                    const key = `${base}_${suffix}.webp`;
                    return (await existingUrl(key)) || (DRY ? PREFIX + key : putObject(buf, key, 'image/webp', cfg));
                };
                const meta = {
                    blurDataURL: v.blurDataURL,
                    lowResUrl: await put(v.thumb, 'thumb'),
                    xs: await put(v.xs, 'xs'),
                    md: await put(v.md, 'md'),
                    lg: await put(v.lg, 'lg'),
                    source: r.image,
                };
                if (!DRY) await db.query(`update ${table} set image_meta = $1 where id = $2`, [meta, r.id]);
                before += src.length; thumbs += v.thumb.length; lgs += v.lg.length; done++;
                console.log(`  ✅ ${table}/${r.id}: asl ${kb(src.length)} KB → aylana (thumb) ${kb(v.thumb.length)} KB, lg ${kb(v.lg.length)} KB`);
            } catch (e) {
                failed++;
                console.log(`  ⚠️ ${table}/${r.id}: ${e.message}`);
            }
        }
        report.push({ table, total: rows.length, done, skipped, failed, originalKB: kb(before), thumbKB: kb(thumbs), lgKB: kb(lgs) });
    }
    console.log(`\n${DRY ? '[DRY] ' : ''}HISOBOT:`);
    console.table(report);
    await db.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
