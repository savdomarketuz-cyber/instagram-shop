require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- 1. pgvector kengaytmasini yoqish
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Products jadvaliga vektor ustunini qo'shish (384 - all-MiniLM-L6-v2 standard o'lchami)
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 3. Qidiruv samaradorligini oshirish uchun Index yaratish (IVFFlat yoki HNSW)
-- HNSW qimmatroq lekin Google darajasidagi aniqlik beradi
-- Kichik/Medium do'kon uchun IVFFlat ham yetarli
CREATE INDEX IF NOT EXISTS products_embedding_idx ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Vektorli qidiruv uchun maxsus RPC funksiya (Server-side search)
CREATE OR REPLACE FUNCTION match_products (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text,
  name text,
  name_uz text,
  name_ru text,
  image text,
  price numeric,
  old_price numeric,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.name_uz,
    p.name_ru,
    p.image,
    p.price,
    p.old_price,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.is_deleted = false AND (1 - (p.embedding <=> query_embedding)) > match_threshold
  ORDER BY p.embedding <=> query_embedding
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
    console.log('Connected to Supabase Postgres!');
    console.log('Enabling pgvector and advanced search functions...');
    await client.query(sql);
    console.log('✅ Vector Search Infrastructure Ready!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

main();
