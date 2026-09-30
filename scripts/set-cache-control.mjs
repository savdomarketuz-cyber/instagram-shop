// Mavjud Yandex Object Storage obyektlariga Cache-Control: public, max-age=31536000, immutable (TASK P3b).
// Bir martalik, qayta ishga tushirish xavfsiz: sarlavhasi to'g'ri obyektlar o'tkazib yuboriladi.
//
//   node --experimental-strip-types scripts/set-cache-control.mjs --dry           (faqat hisobot)
//   node --experimental-strip-types scripts/set-cache-control.mjs                 (hammasi)
//   node --experimental-strip-types scripts/set-cache-control.mjs --prefix admin/ (bitta papka)
//   node --experimental-strip-types scripts/set-cache-control.mjs --from-db       (faqat bazada ishlatiladigan URL'lar —
//        mahsulot rasmlari/variantlari/video, stories, kategoriya, banner, brend, blog; bucket'da ~70 ming obyekt bor)
//
// Qanday: obyekt o'z joyiga nusxalanadi (x-amz-copy-source + x-amz-metadata-directive: REPLACE) —
// mazmuni va Content-Type saqlanadi, faqat Cache-Control qo'shiladi. Hech narsa o'chirilmaydi.
// Fayl nomlari vaqt belgisi bilan noyob (yangilanganda yangi URL) — shuning uchun immutable xavfsiz.
// O'zgartirilgan obyektlar ro'yxati (oldingi sarlavhalar bilan): scripts/backups/cache-control-<vaqt>.json

import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl, readEnvFileKey } from './get_db_url.mjs';
import { s3Request, IMMUTABLE_CACHE_CONTROL } from '../src/lib/s3-put.ts';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const PREFIX = args.includes('--prefix') ? args[args.indexOf('--prefix') + 1] : '';
const FROM_DB = args.includes('--from-db');
const CONCURRENCY = 8;
const cfg = {
    accessKey: readEnvFileKey('YANDEX_S3_ACCESS_KEY') || '',
    secretKey: readEnvFileKey('YANDEX_S3_SECRET_KEY') || '',
    bucket: readEnvFileKey('YANDEX_S3_BUCKET') || 'savdomarketimag',
    region: readEnvFileKey('YANDEX_S3_REGION') || 'ru-central1',
};
if (!cfg.accessKey || !cfg.secretKey) { console.error('❌ YANDEX_S3 kalitlari topilmadi (.env.local)'); process.exit(1); }

const tag = (xml, t) => [...xml.matchAll(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`, 'g'))].map(m => m[1]);
const unxml = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

async function listAll() {
    const keys = [];
    let token = null;
    do {
        const query = { 'list-type': '2', 'max-keys': '1000', prefix: PREFIX };
        if (token) query['continuation-token'] = token;
        const res = await s3Request('GET', '', { query, config: cfg });
        const xml = await res.text();
        if (!res.ok) throw new Error(`ListObjects ${res.status}: ${xml.slice(0, 200)}`);
        const contents = tag(xml, 'Contents');
        for (const c of contents) keys.push({ key: unxml(tag(c, 'Key')[0]), size: Number(tag(c, 'Size')[0] || 0) });
        token = tag(xml, 'IsTruncated')[0] === 'true' ? unxml(tag(xml, 'NextContinuationToken')[0] || '') : null;
        process.stdout.write(`\r📃 ro'yxat: ${keys.length}   `);
    } while (token);
    process.stdout.write('\n');
    return keys;
}

// Bazadagi barcha storage.yandexcloud.net URL'lari (JSON ichidagilari ham)
async function listFromDb() {
    const db = new pg.Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
    await db.connect();
    const prefix = `https://storage.yandexcloud.net/${cfg.bucket}/`;
    const sources = [
        `select concat_ws(' ', image, array_to_string(images, ' '), image_metadata::text, video_url) t from products where is_deleted = false`,
        `select concat_ws(' ', image, image_meta::text, video, audio) t from stories`,
        `select concat_ws(' ', image, image_meta::text) t from categories where is_deleted = false`,
        `select concat_ws(' ', image_url_uz, image_url_ru, image_meta::text) t from banners`,
        `select concat_ws(' ', image) t from brands where is_deleted = false`,
        `select concat_ws(' ', image) t from blogs where is_deleted = false`,
        `select concat_ws(' ', logo) t from warehouses`,
    ];
    const keys = new Set();
    for (const q of sources) {
        try {
            for (const r of (await db.query(q)).rows) {
                for (const m of String(r.t || '').matchAll(/https:\/\/storage\.yandexcloud\.net\/[^\s"',\\]+/g)) {
                    if (m[0].startsWith(prefix)) keys.add(decodeURIComponent(m[0].slice(prefix.length).split('?')[0]));
                }
            }
        } catch (e) { console.log(`⚠️ ${q.slice(0, 60)}…: ${e.message}`); }
    }
    await db.end();
    console.log(`🗂  bazadan ${keys.size} ta URL`);
    return [...keys].map(key => ({ key, size: 0 }));
}

async function main() {
    const objects = FROM_DB ? await listFromDb() : await listAll();
    const changed = [];
    let ok = 0, skip = 0, fail = 0, done = 0;
    let i = 0;
    const worker = async () => {
        while (i < objects.length) {
            const { key, size } = objects[i++];
            try {
                const head = await s3Request('HEAD', key, { config: cfg });
                if (!head.ok) throw new Error(`HEAD ${head.status}`);
                const cc = head.headers.get('cache-control') || '';
                if (cc.includes('immutable') && cc.includes('max-age=31536000')) { skip++; continue; }
                const contentType = head.headers.get('content-type') || 'application/octet-stream';
                if (!DRY) {
                    const res = await s3Request('PUT', key, {
                        config: cfg,
                        contentType,
                        cacheControl: IMMUTABLE_CACHE_CONTROL,
                        amzHeaders: {
                            'x-amz-copy-source': `/${cfg.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`,
                            'x-amz-metadata-directive': 'REPLACE',
                        },
                    });
                    if (!res.ok) throw new Error(`COPY ${res.status}: ${(await res.text()).slice(0, 160)}`);
                }
                changed.push({ key, size, contentType, before: cc || null });
                ok++;
            } catch (e) {
                fail++;
                if (fail <= 10) console.log(`\n⚠️ ${key}: ${e.message}`);
            } finally {
                done++;
                if (done % 50 === 0 || done === objects.length) process.stdout.write(`\r${DRY ? '[DRY] ' : ''}✅ ${done}/${objects.length}  o'rnatildi: ${ok}, allaqachon bor: ${skip}, xato: ${fail}   `);
            }
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    process.stdout.write('\n');
    fs.mkdirSync('scripts/backups', { recursive: true });
    const f = `scripts/backups/cache-control-${new Date().toISOString().replace(/[:.]/g, '-')}${DRY ? '-dry' : ''}.json`;
    fs.writeFileSync(f, JSON.stringify(changed, null, 1));
    const byType = {};
    for (const c of changed) byType[c.contentType] = (byType[c.contentType] || 0) + 1;
    console.log(`\n${DRY ? '[DRY] ' : ''}HISOBOT: jami ${objects.length}, Cache-Control ${DRY ? "qo'yilishi kerak" : "qo'yildi"}: ${ok}, allaqachon bor: ${skip}, xato: ${fail}`);
    console.log('Turlar:', JSON.stringify(byType));
    console.log(`Ro'yxat: ${f}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
