const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getParams() {
  const { data, error } = await supabase.from('category_params').select('name_uz, predefined_values');
  if (error) return console.error(error);
  
  const map = {};
  data.forEach(p => {
      const name = p.name_uz;
      if (!map[name]) map[name] = new Set();
      if (Array.isArray(p.predefined_values)) {
          p.predefined_values.forEach(v => map[name].add(v));
      }
  });
  
  const names = Object.keys(map).sort();
  names.forEach((n, i) => {
      const vals = [...map[n]].filter(Boolean);
      console.log(`${i+1}. ${n}: ${vals.length > 0 ? vals.join(', ') : '(qiymat kiritilmagan)'}`);
  });
}
getParams();
