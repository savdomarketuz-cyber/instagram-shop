import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function addModelColumn() {
  console.log('Adding "model" column to "products" table...');
  const { error } = await supabase.rpc('execute_sql', {
    sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT;'
  });

  if (error) {
    console.log('RPC failed (expected if no execute_sql function), trying direct check...');
    // If RPC fails, we can't really do it via anon key unless we have a specific function.
    // In many setups, we do:
    const { error: queryErr } = await supabase.from('products').select('model').limit(1);
    if (queryErr) {
       console.error('Model column does not exist or access denied. Please add it via Supabase Dashboard: ALTER TABLE products ADD COLUMN model TEXT;');
    } else {
       console.log('Model column already exists!');
    }
  } else {
    console.log('Column added successfully!');
  }
}

addModelColumn();
