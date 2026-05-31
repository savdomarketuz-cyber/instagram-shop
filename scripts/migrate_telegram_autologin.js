require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// Telegram bot orqali ro'yxatdan o'tib, saytga login holatida qaytish uchun:
// - bot_sessions: next_path (qaytish manzili) + pwd_msg_id (parol xabarlarini o'chirish uchun)
// - login_tokens: bir martalik avtomatik kirish tokeni
const sql = `
ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS next_path text;
ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS pwd_msg_id bigint;

CREATE TABLE IF NOT EXISTS login_tokens (
  token       text PRIMARY KEY,
  phone       text NOT NULL,
  next_path   text,
  used        boolean NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_tokens_expires ON login_tokens(expires_at);
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('🔗 Connected. Applying telegram auto-login schema...');
    await client.query(sql);
    console.log('✅ Done.');

    const check = async (table, col) => {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [table, col]);
      console.log(`   ${table}.${col}:`, rows.length ? 'OK' : 'MISSING');
    };
    await check('bot_sessions', 'next_path');
    await check('bot_sessions', 'pwd_msg_id');
    await check('login_tokens', 'token');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main();
