const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixThem() {
  const translations = [
      {en: 'the fast heating list', uz: 'Tez qizish'},
      {en: 'the overheating protection list', uz: 'Haddan tashqari issiqlikdan himoya'},
      {en: 'the automatic shutdown list', uz: 'Avtomatik o\'chish'}
  ];
  for (const t of translations) {
     const { data } = await supabase.from('product_param_values').select('*').ilike('value', '%' + t.en + '%');
     if (data) {
         for (const d of data) {
             const newVal = d.value.replace(new RegExp(t.en, 'gi'), t.uz);
             await supabase.from('product_param_values').update({ value: newVal }).eq('id', d.id);
         }
         console.log('Fixed', t.en, data.length, 'rows');
     }
  }
  
  // also fix 6
  const { data: sixes } = await supabase.from('product_param_values').select('id, param_id').eq('value', '6');
  if (sixes) {
      let count = 0;
      for (const s of sixes) {
          const { data: p } = await supabase.from('category_params').select('name_uz').eq('id', s.param_id).single();
          if (p && p.name_uz === 'Quvvat, Vt') {
              await supabase.from('product_param_values').delete().eq('id', s.id);
              count++;
          }
      }
      console.log('Deleted 6 from Quvvat, Vt', count, 'rows');
  }
}
fixThem();
