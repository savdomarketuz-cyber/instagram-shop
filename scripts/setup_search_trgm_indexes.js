require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

/**
 * Qidiruv tezligi uchun GIN trigram indekslari.
 * advanced_smart_search ichidagi similarity() va ILIKE '%...%' bu indekslarsiz
 * butun jadval skanini keltiradi. pg_trgm GIN bilan trigram qidiruv indeksdan foydalanadi.
 */
const sql = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm    ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_uz_trgm ON products USING gin (name_uz gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_ru_trgm ON products USING gin (name_ru gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_desc_trgm    ON products USING gin (description gin_trgm_ops);

-- Eslatma: ANALYZE rejani yangilash uchun
ANALYZE products;
`;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('Connected to DB. Creating trigram indexes...');
        await client.query(sql);
        console.log('✅ Trigram GIN indexes installed (name, name_uz, name_ru, description).');
    } catch (err) {
        console.error('❌ DB Setup Error:', err);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

main();
