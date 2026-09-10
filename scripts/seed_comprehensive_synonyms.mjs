import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl } from './get_db_url.mjs';

const url = getDatabaseUrl();

const synonyms = [
    // --- 1. O'ZBEKCHA TILLARDAGI SO'ZLAR ---
    { keyword: "soch olish mashinkasi", maps_to: "trimmer" },
    { keyword: "soch mashinkasi", maps_to: "trimmer" },
    { keyword: "soqol olish mashinkasi", maps_to: "trimmer" },
    { keyword: "soqol olgich", maps_to: "trimmer" },
    { keyword: "soqol mashinkasi", maps_to: "trimmer" },
    { keyword: "quloqchin", maps_to: "naushnik" },
    { keyword: "quloqchinlar", maps_to: "naushnik" },
    { keyword: "simsiz quloqchin", maps_to: "naushnik" },
    { keyword: "fen taroq", maps_to: "fen" },
    { keyword: "soch to'g'irlagich", maps_to: "utyujok" },
    { keyword: "soch tekislagich", maps_to: "utyujok" },
    { keyword: "soch dazmoli", maps_to: "utyujok" },
    { keyword: "aqlli soat", maps_to: "smart watch" },
    { keyword: "elektron soat", maps_to: "smart watch" },

    // --- 2. RUSCHA SO'ZLAR ---
    { keyword: "триммер", maps_to: "trimmer" },
    { keyword: "машинка для стрижки", maps_to: "trimmer" },
    { keyword: "машинка для волос", maps_to: "trimmer" },
    { keyword: "машинка для бороды", maps_to: "trimmer" },
    { keyword: "наушники", maps_to: "airpods" },
    { keyword: "беспроводные наушники", maps_to: "airpods" },
    { keyword: "блютуз наушники", maps_to: "airpods" },
    { keyword: "фен для волос", maps_to: "фен" },
    { keyword: "фен щетка", maps_to: "фен" },
    { keyword: "утюжок для волос", maps_to: "утюжок" },
    { keyword: "выпрямитель для волос", maps_to: "выпрямитель" },
    { keyword: "выпрямитель", maps_to: "утюжок" },
    { keyword: "плойка для волос", maps_to: "плойка" },
    { keyword: "эпилятор", maps_to: "эпилятор" },
    { keyword: "колонка", maps_to: "колонка" },
    { keyword: "беспроводная колонка", maps_to: "колонка" },
    { keyword: "умные часы", maps_to: "smart watch" },

    // --- 3. INGLIZCHA SO'ZLAR ---
    { keyword: "headphone", maps_to: "naushnik" },
    { keyword: "headphones", maps_to: "naushnik" },
    { keyword: "earphones", maps_to: "naushnik" },
    { keyword: "earbuds", maps_to: "airpods" },
    { keyword: "clipper", maps_to: "trimmer" },
    { keyword: "hair clipper", maps_to: "trimmer" },
    { keyword: "shaver", maps_to: "trimmer" },
    { keyword: "hair dryer", maps_to: "fen" },
    { keyword: "hair straightener", maps_to: "utyujok" },
    { keyword: "speaker", maps_to: "kolonka" },
    { keyword: "bluetooth speaker", maps_to: "kolonka" },

    // --- 4. TYPO & IMLO XATOLARI ---
    { keyword: "arpods", maps_to: "airpods" },
    { keyword: "ayrpods", maps_to: "airpods" },
    { keyword: "airpod", maps_to: "airpods" },
    { keyword: "air pods", maps_to: "airpods" },
    { keyword: "klipper", maps_to: "clipper" },
    { keyword: "kliper", maps_to: "clipper" },
    { keyword: "ayfon", maps_to: "iphone" },
    { keyword: "aifon", maps_to: "iphone" },
    { keyword: "ayphone", maps_to: "iphone" },
    { keyword: "samusng", maps_to: "samsung" },
    { keyword: "sasung", maps_to: "samsung" },
    { keyword: "samsyng", maps_to: "samsung" },
    { keyword: "trimer", maps_to: "trimmer" },
    { keyword: "termir", maps_to: "trimmer" },
    { keyword: "trimmr", maps_to: "trimmer" },
    { keyword: "machinka", maps_to: "mashinka" },
    { keyword: "kalonka", maps_to: "kolonka" },

    // --- 5. MODELLAR VA ARTIKULLAR ---
    { keyword: "v-097", maps_to: "V-097" },
    { keyword: "v097", maps_to: "V-097" },
    { keyword: "v 097", maps_to: "V-097" },
    { keyword: "v-906", maps_to: "V-906" },
    { keyword: "v906", maps_to: "V-906" },
    { keyword: "v-961", maps_to: "V-961" },
    { keyword: "v961", maps_to: "V-961" },
    { keyword: "v-662", maps_to: "V-662" },
    { keyword: "v662", maps_to: "V-662" },
    { keyword: "v-475", maps_to: "V-475" },
    { keyword: "v475", maps_to: "V-475" },
    { keyword: "mc-6699", maps_to: "MC-6699" },
    { keyword: "mc6699", maps_to: "MC-6699" },
    { keyword: "mc-2218", maps_to: "MC-2218" },
    { keyword: "mc2218", maps_to: "MC-2218" },
    { keyword: "mc-5583", maps_to: "MC-5583" },
    { keyword: "mc5583", maps_to: "MC-5583" },
    { keyword: "cr-6888", maps_to: "CR-6888" },
    { keyword: "cr6888", maps_to: "CR-6888" },
    { keyword: "cr-8108", maps_to: "CR-8108" },
    { keyword: "cr8108", maps_to: "CR-8108" },
    { keyword: "airpods max", maps_to: "AirPods Max" },
];

async function main() {
    const client = new pg.Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to DB. Seeding comprehensive synonyms...');

        let added = 0;
        for (const s of synonyms) {
            const kw = s.keyword.toLowerCase().trim();
            await client.query('DELETE FROM search_synonyms WHERE lower(keyword) = $1', [kw]);
            await client.query('INSERT INTO search_synonyms (keyword, maps_to) VALUES ($1, $2)', [kw, s.maps_to]);
            added++;
        }

        const countRes = await client.query('SELECT count(*) FROM search_synonyms');
        console.log(`✅ Synonyms seed complete! Processed ${added} entries. Total in DB: ${countRes.rows[0].count}`);

    } catch (err) {
        console.error('❌ Synonyms seeding error:', err);
    } finally {
        await client.end();
    }
}

main();
