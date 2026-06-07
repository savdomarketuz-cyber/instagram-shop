const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function get() {
  const { data: catParams } = await supabase.from('category_params').select('id, category_id');
  const { data: prodParams } = await supabase.from('product_param_values').select('id');
  const { data: globalParams } = await supabase.from('parameters').select('id');
  console.log(`Global params: ${globalParams?.length}, Category Params: ${catParams?.length}, Product Param Values: ${prodParams?.length}`);
  
  if (catParams && catParams.length > 0) {
     const catIds = [...new Set(catParams.map(c => c.category_id))];
     const { data: cats } = await supabase.from('categories').select('id, name_uz').in('id', catIds);
     console.log('Categories with params:', cats.map(c => c.name_uz).join(', '));
  }
}
get();
