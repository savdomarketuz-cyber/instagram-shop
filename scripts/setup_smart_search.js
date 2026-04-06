require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  results_count integer default 0,
  user_phone text,
  created_at timestamp with time zone default now()
);

-- 3. Add embedding column to products if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 4. Advanced Smart Search Function (Fuzzy + Weighted + Semantic)
CREATE OR REPLACE FUNCTION advanced_smart_search (
  search_query text,
  query_embedding vector(384) DEFAULT NULL,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 50
)
RETURNS SETOF products
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM products p
  WHERE p.is_deleted = false
    AND (
      -- Condition 1: High text similarity (Fuzzy search)
      (search_query IS NOT NULL AND search_query != '' AND (
        similarity(COALESCE(p.name, ''), search_query) > 0.1 OR
        similarity(COALESCE(p.name_uz, ''), search_query) > 0.1 OR
        similarity(COALESCE(p.name_ru, ''), search_query) > 0.1 OR
        similarity(COALESCE(p.description, ''), search_query) > 0.1 OR
        p.name ILIKE '%' || search_query || '%' OR
        p.name_uz ILIKE '%' || search_query || '%' OR
        p.name_ru ILIKE '%' || search_query || '%' OR
        p.sku ILIKE '%' || search_query || '%' OR
        p.article ILIKE '%' || search_query || '%' OR
        p.tag ILIKE '%' || search_query || '%'
      ))
      OR
      -- Condition 2: Semantic Similarity
      (query_embedding IS NOT NULL AND p.embedding IS NOT NULL AND (1 - (p.embedding <=> query_embedding)) > match_threshold)
    )
  ORDER BY (
      -- Score Calculation
      (
          CASE WHEN search_query IS NOT NULL AND search_query != '' THEN
              -- Exact Match (Very High Weight)
              CASE WHEN p.name ILIKE search_query OR p.name_uz ILIKE search_query OR p.name_ru ILIKE search_query THEN 100 ELSE 0 END
              +
              -- Prefix Match (High Weight)
              CASE WHEN p.name ILIKE search_query || '%' OR p.name_uz ILIKE search_query || '%' OR p.name_ru ILIKE search_query || '%' THEN 50 ELSE 0 END
              +
              -- Trigram similarity on Title/Name (High Weight)
              (similarity(COALESCE(p.name, ''), search_query) * 40) +
              (similarity(COALESCE(p.name_uz, ''), search_query) * 40) +
              (similarity(COALESCE(p.name_ru, ''), search_query) * 40) +
              -- Trigram similarity on Description/Tags (Low Weight)
              (similarity(COALESCE(p.description, ''), search_query) * 10) +
              (similarity(COALESCE(p.tag, ''), search_query) * 5)
          ELSE 0 END
      )
      +
      -- Semantic Vector Similarity
      (CASE WHEN query_embedding IS NOT NULL AND p.embedding IS NOT NULL THEN
        (1 - (p.embedding <=> query_embedding)) * 80
      ELSE 0 END)
  ) DESC, p.sales DESC
  LIMIT match_count;
END;
$$;
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to DB');
    console.log('Running setup for Fuzzy + Weighted + Semantic + Analytics...');
    await client.query(sql);
    console.log('✅ Setup complete!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

main();
