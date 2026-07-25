const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.from('promo_code_tariffs').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log("Mavjud tariflar:", data);
  }
}

run();
