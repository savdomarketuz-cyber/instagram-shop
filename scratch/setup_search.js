const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupSmartSearch() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log("Bazaga ulandi. Smart Search o'rnatilmoqda...\n");

    try {
        // ═══════════════════════════════════════════════
        // 1. pg_trgm EXTENSION (xato yozuvlarni topish)
        // ═══════════════════════════════════════════════
        await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
        console.log("✅ pg_trgm extension yoqildi");

        // ═══════════════════════════════════════════════
        // 2. FULL-TEXT SEARCH INDEKSLARI
        // ═══════════════════════════════════════════════
        await client.query(`
            DROP INDEX IF EXISTS idx_products_fts;
            CREATE INDEX idx_products_fts 
            ON products USING gin(
                to_tsvector('simple', 
                    COALESCE(name, '') || ' ' || 
                    COALESCE(name_uz, '') || ' ' || 
                    COALESCE(name_ru, '') || ' ' || 
                    COALESCE(description, '') || ' ' ||
                    COALESCE(sku, '') || ' ' ||
                    COALESCE(article, '') || ' ' ||
                    COALESCE(model, '')
                )
            );
        `);
        console.log("✅ Full-text search indeksi yaratildi");

        // ═══════════════════════════════════════════════
        // 3. TRIGRAM INDEKSI (fuzzy matching)
        // ═══════════════════════════════════════════════
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
            ON products USING gin(name gin_trgm_ops);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_name_uz_trgm 
            ON products USING gin(name_uz gin_trgm_ops);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_name_ru_trgm 
            ON products USING gin(name_ru gin_trgm_ops);
        `);
        console.log("✅ Trigram indekslari yaratildi");

        // ═══════════════════════════════════════════════
        // 4. SINONIMLAR JADVALI
        // ═══════════════════════════════════════════════
        await client.query(`
            CREATE TABLE IF NOT EXISTS search_synonyms (
                id SERIAL PRIMARY KEY,
                keyword TEXT NOT NULL,
                maps_to TEXT NOT NULL,
                language TEXT DEFAULT 'uz',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_synonyms_keyword 
            ON search_synonyms USING gin(keyword gin_trgm_ops);
        `);
        console.log("✅ search_synonyms jadvali yaratildi");

        // ═══════════════════════════════════════════════
        // 5. SINONIMLAR — O'ZBEK E-COMMERCE LUG'ATI
        // ═══════════════════════════════════════════════
        
        // Avval eski ma'lumotlarni tozalash
        await client.query(`DELETE FROM search_synonyms;`);

        const synonyms = [
            // ══════ BRENDLAR (O'zbek yozuvi) ══════
            ['ayfon', 'iphone'], ['ayphone', 'iphone'], ['ayfon', 'iphone'],
            ['aypad', 'ipad'], ['aypod', 'airpods'],
            ['ayrvoch', 'apple watch'], ['eppl', 'apple'],
            ['sasung', 'samsung'], ['samsyng', 'samsung'], ['samsung', 'samsung'],
            ['shyaomi', 'xiaomi'], ['shaomi', 'xiaomi'], ['syaomi', 'xiaomi'], ['mi', 'xiaomi'],
            ['xvey', 'huawei'], ['xuavey', 'huawei'], ['huavey', 'huawei'],
            ['redmi', 'xiaomi redmi'], ['poco', 'xiaomi poco'],
            ['jbl', 'jbl'], ['jibiel', 'jbl'],
            ['dyson', 'dyson'], ['dayson', 'dyson'],
            ['bosh', 'bosch'], ['bosh', 'bosch'],
            ['filips', 'philips'], ['fillips', 'philips'],
            ['lenovo', 'lenovo'], ['lenava', 'lenovo'],
            
            // ══════ MAHSULOT TURLARI (O'zbek) ══════
            ['telefon', 'smartphone'], ['uyali telefon', 'smartphone'], ['smartfon', 'smartphone'],
            ['telfon', 'smartphone'], ['telifon', 'smartphone'],
            ['noutbuk', 'laptop'], ['noutbook', 'laptop'], ['notebook', 'laptop'],
            ['nout', 'laptop'], ['kompyuter', 'laptop'],
            ['planset', 'tablet'], ['planshet', 'tablet'],
            ['naushnik', 'earphones'], ['quloqchin', 'earphones'], ['minigarnitura', 'earphones'],
            ['kolonka', 'speaker'], ['dinamik', 'speaker'], ['kalonka', 'speaker'],
            ['zaryadka', 'charger'], ['zaryatka', 'charger'], ['adapter', 'charger'],
            ['quvvatlagich', 'charger'], ['powerbank', 'power bank'], ['paverbank', 'power bank'],
            ['soat', 'watch'], ['aqlli soat', 'smart watch'], ['smart soat', 'smart watch'],
            ['kabel', 'cable'], ['shnur', 'cable'], ['provod', 'cable'],
            ['chexol', 'case'], ['qopqoq', 'case'], ['kabura', 'case'],
            ['stakan', 'glass'], ['plyonka', 'screen protector'], ['himoya', 'screen protector'],
            ['sumka', 'bag'], ['ryukzak', 'backpack'], ['portfel', 'bag'],
            ['monitor', 'monitor'], ['ekran', 'monitor'],
            ['klaviatura', 'keyboard'], ['klavyatura', 'keyboard'],
            ['sichqoncha', 'mouse'], ['mishka', 'mouse'], ['mouse', 'mouse'],
            ['printer', 'printer'], ['prenter', 'printer'],
            ['kamera', 'camera'], ['fotoaparat', 'camera'],
            ['fleshka', 'flash drive'], ['flesh', 'flash drive'],
            ['router', 'router'], ['routyer', 'router'], ['modem', 'router'],
            
            // ══════ MAISHIY TEXNIKA ══════
            ['blender', 'blender'], ['blinder', 'blender'],
            ['mikser', 'mixer'],
            ['changyutgich', 'vacuum cleaner'], ['pylesos', 'vacuum cleaner'], ['pilecos', 'vacuum cleaner'],
            ['konditsioner', 'air conditioner'], ['kondicioner', 'air conditioner'],
            ['dazmol', 'iron'], ['utug', 'iron'], ['utyug', 'iron'],
            ['fen', 'hair dryer'], ['sushilka', 'hair dryer'],
            ['choynak', 'kettle'], ['chaynik', 'kettle'],
            ['muzlatgich', 'refrigerator'], ['xolodilnik', 'refrigerator'],
            ['kir yuvish', 'washing machine'], ['stiralka', 'washing machine'],
            ['pechka', 'oven'], ['mikrovolnovka', 'microwave'],
            ['toster', 'toaster'], ['gril', 'grill'],
            ['soqol mashinasi', 'shaver'], ['britva', 'shaver'], ['trimmer', 'trimmer'],
            ['mashinka', 'clipper'], ['soch olish', 'clipper'],
            ['dazmollash', 'straightener'], ['utyuzhok', 'straightener'], ['ployka', 'curling iron'],

            // ══════ XUSUSIYATLAR ══════
            ['arzon', 'cheap'], ['hamyonbop', 'cheap'], ['byudjet', 'budget'],
            ['original', 'original'], ['asl', 'original'],
            ['kopiya', 'copy'], ['dublikat', 'copy'],
            ['simsiz', 'wireless'], ['bluetooth', 'bluetooth'], ['blyutuz', 'bluetooth'],
            ['sensorli', 'touchscreen'], ['touch', 'touchscreen'],
            ['suvsiz', 'waterproof'], ['suvdan himoya', 'waterproof'],
            ['qora', 'black'], ['oq', 'white'], ['kumush', 'silver'],
            ['oltin', 'gold'], ['pushti', 'pink'], ['yashil', 'green'],
            ['qizil', 'red'], ['moviy', 'blue'], ['ko\'k', 'blue'],

            // ══════ RUS TILI SINONIMLARI ══════
            ['наушники', 'earphones'], ['колонка', 'speaker'],
            ['телефон', 'smartphone'], ['ноутбук', 'laptop'],
            ['планшет', 'tablet'], ['зарядка', 'charger'],
            ['чехол', 'case'], ['часы', 'watch'],
            ['пылесос', 'vacuum cleaner'], ['утюг', 'iron'],
            ['фен', 'hair dryer'], ['блендер', 'blender'],
            ['холодильник', 'refrigerator'], ['стиралка', 'washing machine'],
            ['бритва', 'shaver'], ['триммер', 'trimmer'],
            ['клавиатура', 'keyboard'], ['мышка', 'mouse'],
            ['флешка', 'flash drive'], ['кабель', 'cable'],
            ['айфон', 'iphone'], ['самсунг', 'samsung'],
            ['сяоми', 'xiaomi'], ['хуавей', 'huawei'],
        ];

        // Bulk insert
        const values = synonyms.map((s, i) => `($${i*2+1}, $${i*2+2})`).join(', ');
        const params = synonyms.flat();
        await client.query(
            `INSERT INTO search_synonyms (keyword, maps_to) VALUES ${values}`,
            params
        );
        console.log(`✅ ${synonyms.length} ta sinonim qo'shildi`);

        // ═══════════════════════════════════════════════
        // 6. SMART SEARCH FUNKSIYASI (SQL)
        // ═══════════════════════════════════════════════
        await client.query(`
            CREATE OR REPLACE FUNCTION smart_search(search_query TEXT, result_limit INTEGER DEFAULT 20)
            RETURNS TABLE (
                id UUID,
                name TEXT,
                name_uz TEXT,
                name_ru TEXT,
                price NUMERIC,
                old_price NUMERIC,
                image TEXT,
                images TEXT[],
                category_id TEXT,
                stock INTEGER,
                sku TEXT,
                brand_id TEXT,
                tag TEXT,
                relevance REAL
            ) AS $$
            DECLARE
                expanded_query TEXT;
                synonym_match TEXT;
            BEGIN
                -- 1. Sinonimlarni tekshir
                expanded_query := search_query;
                
                FOR synonym_match IN 
                    SELECT s.maps_to FROM search_synonyms s 
                    WHERE LOWER(search_query) LIKE '%' || s.keyword || '%'
                    LIMIT 3
                LOOP
                    expanded_query := expanded_query || ' ' || synonym_match;
                END LOOP;

                RETURN QUERY
                -- A: Aniq moslik (FTS) — eng yuqori relevantlik
                SELECT DISTINCT ON (p.id)
                    p.id, p.name, p.name_uz, p.name_ru,
                    p.price, p.old_price, p.image, p.images,
                    p.category_id, p.stock, p.sku, p.brand_id, p.tag,
                    ts_rank(
                        to_tsvector('simple', 
                            COALESCE(p.name,'') || ' ' || COALESCE(p.name_uz,'') || ' ' || 
                            COALESCE(p.name_ru,'') || ' ' || COALESCE(p.model,'') || ' ' || COALESCE(p.sku,'')
                        ),
                        plainto_tsquery('simple', expanded_query)
                    )::REAL AS relevance
                FROM products p
                WHERE p.is_deleted = false
                AND (
                    -- Full-text search (aniq so'zlar)
                    to_tsvector('simple', 
                        COALESCE(p.name,'') || ' ' || COALESCE(p.name_uz,'') || ' ' || 
                        COALESCE(p.name_ru,'') || ' ' || COALESCE(p.model,'') || ' ' || COALESCE(p.sku,'')
                    ) @@ plainto_tsquery('simple', expanded_query)
                    OR
                    -- Trigram (fuzzy — xato yozuvlar)
                    similarity(COALESCE(p.name,''), search_query) > 0.25
                    OR similarity(COALESCE(p.name_uz,''), search_query) > 0.25
                    OR similarity(COALESCE(p.name_ru,''), search_query) > 0.25
                    OR
                    -- Fallback ILIKE (oddiy qidiruv)
                    p.name ILIKE '%' || search_query || '%'
                    OR p.name_uz ILIKE '%' || search_query || '%'
                    OR p.name_ru ILIKE '%' || search_query || '%'
                    OR p.sku ILIKE '%' || search_query || '%'
                    OR p.model ILIKE '%' || search_query || '%'
                )
                ORDER BY p.id, relevance DESC
                LIMIT result_limit;
            END;
            $$ LANGUAGE plpgsql STABLE;
        `);
        console.log("✅ smart_search() funksiyasi yaratildi");

        console.log("\n🎉 SMART SEARCH tizimi to'liq o'rnatildi!");
        console.log("   - Full-text Search ✅");
        console.log("   - Fuzzy matching (pg_trgm) ✅");
        console.log("   - Sinonimlar (UZ/RU) ✅");
        console.log("   - smart_search() funksiyasi ✅");

    } catch (err) {
        console.error("❌ XATOLIK:", err.message);
        console.error(err);
    } finally {
        await client.end();
    }
}

setupSmartSearch();
