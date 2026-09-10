import fs from 'fs';
import pg from 'pg';

const url = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/132d8379-3723-45a6-a02d-bb9203322573/scratch/db_url.txt', 'utf8').trim();

// Local embeddings generator
let embedder = null;
async function getEmbedding(text) {
    if (!embedder) {
        const { pipeline } = await import('@xenova/transformers');
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    const out = await embedder(text, { pooling: 'mean', normalize: true });
    return `[${Array.from(out.data).join(',')}]`;
}

async function runSearch(client, query, useEmbedding = true) {
    const start = Date.now();
    let emb = null;
    if (useEmbedding && query) {
        try { emb = await getEmbedding(query); } catch {}
    }
    const res = await client.query(
        'SELECT id, name, name_uz, name_ru, model, article, price, stock, get_product_stock(stock, stock_details) as real_stock FROM advanced_smart_search($1, $2, 0.25, 10, NULL)',
        [query, emb]
    );
    const duration = Date.now() - start;
    return {
        results: res.rows,
        count: res.rows.length,
        duration
    };
}

async function main() {
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('Connected to DB. Starting Golden Search Tests...\n');

    const tests = [
        {
            name: "Test 1: 'vgr' (Brand query)",
            query: "vgr",
            assert: (r) => r.count > 0 && r.results[0].name.toLowerCase().includes('vgr'),
            expected: "VGR mahsulotlari ro'yxati va 1-o'rinda VGR"
        },
        {
            name: "Test 2: 'vgr v-097' (Exact model query)",
            query: "vgr v-097",
            assert: (r) => r.count > 0 && (r.results[0].name.toLowerCase().includes('097') || (r.results[0].model || '').toLowerCase().includes('097')),
            expected: "V-097 modeli 1-o'rinda chiqishi"
        },
        {
            name: "Test 3: 'arpods' (Typo query)",
            query: "arpods",
            assert: (r) => r.count > 0,
            expected: "Typo tuzatilib natijalar chiqishi"
        },
        {
            name: "Test 4: 'airpods max' (Multi-word brand model)",
            query: "airpods max",
            assert: (r) => r.count > 0 && r.results[0].name.toLowerCase().includes('pods'),
            expected: "AirPods / Pods mahsulotlari chiqishi"
        },
        {
            name: "Test 5: 'триммер' (Russian synonym)",
            query: "триммер",
            assert: (r) => r.count > 0 && r.results.some(x => (x.name + x.name_ru).toLowerCase().includes('триммер') || (x.name + x.name_ru).toLowerCase().includes('trimmer')),
            expected: "Trimmer mahsulotlari chiqishi"
        },
        {
            name: "Test 6: 'soch olish mashinkasi' (Uzbek semantic synonym)",
            query: "soch olish mashinkasi",
            assert: (r) => r.count > 0,
            expected: "Soch olish / trimmer mahsulotlari chiqishi"
        },
        {
            name: "Test 7: 'naushnik' (Audio category query)",
            query: "naushnik",
            assert: (r) => r.count > 0,
            expected: "Quloqchin / naushnik mahsulotlari chiqishi"
        },
        {
            name: "Test 8: 'klipper' (Typo clipper/trimmer)",
            query: "klipper",
            assert: (r) => r.count > 0,
            expected: "Clipper/trimmerlar chiqishi"
        },
        {
            name: "Test 9: 'xyznonexistentqueryqwerty' (Non-existent query)",
            query: "xyznonexistentqueryqwerty",
            assert: (r) => r.count === 0,
            expected: "0 ta natija"
        },
        {
            name: "Test 10: Stock Protection (real_stock > 0 check)",
            query: "vgr",
            assert: (r) => r.results.every(p => Number(p.real_stock) > 0),
            expected: "Barcha qaytgan mahsulotlarning real_stock > 0 bo'lishi"
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const t of tests) {
        try {
            const r = await runSearch(client, t.query);
            const ok = t.assert(r);
            if (ok) {
                console.log(`✅ [PASS] ${t.name} (${r.duration}ms, ${r.count} results)`);
                if (r.count > 0) {
                    console.log(`   Top 1: "${r.results[0].name.slice(0, 50)}" | Stock: ${r.results[0].real_stock}`);
                }
                passed++;
            } else {
                console.log(`❌ [FAIL] ${t.name} (${r.duration}ms, ${r.count} results)`);
                console.log(`   Kutilgan: ${t.expected}`);
                if (r.count > 0) {
                    console.log(`   Haqiqiy Top 1: "${r.results[0].name.slice(0, 50)}"`);
                }
                failed++;
            }
        } catch (err) {
            console.log(`❌ [ERROR] ${t.name}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${tests.length})`);
    console.log(`========================================`);

    await client.end();
    if (failed > 0) process.exitCode = 1;
}

main();
