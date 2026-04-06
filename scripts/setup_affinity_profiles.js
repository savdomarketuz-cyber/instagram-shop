require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
CREATE TABLE IF NOT EXISTS user_affinity_profiles (
    user_identifier text PRIMARY KEY,
    
    -- Price affinity mapping (e.g. 1=Budget, 2=Medium, 3=Premium or exact numeric average)
    avg_price_affinity numeric DEFAULT 0,
    price_segment text DEFAULT 'medium',
    
    -- Categories they visit most (JSON mapping: { "category_id_1": 15, "category_id_2": 8 })
    top_categories jsonb DEFAULT '{}'::jsonb,
    
    -- Behavioral traits
    night_owl boolean DEFAULT false,
    discount_seeker boolean DEFAULT false, -- if they only click products with oldPrice > price
    
    last_computed_at timestamp with time zone DEFAULT now()
);

-- Optimization Index
CREATE INDEX IF NOT EXISTS idx_affinity_segment ON user_affinity_profiles(price_segment);
`;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        await client.query(sql);
        console.log('✅ Affinity profiles schema created successfully!');
    } catch (err) {
        console.error('❌ DB Setup Error:', err);
    } finally {
        await client.end();
    }
}

main();
