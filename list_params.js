const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getParams() {
  const { data, error } = await supabase.from('category_params').select('name_uz');
  if (error) return console.error(error);
  const names = [...new Set(data.map(p => p.name_uz))].sort();
  console.log('All Parameters:');
  names.forEach((n, i) => console.log(`${i+1}. ${n}`));
}
getParams();
