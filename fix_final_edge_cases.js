const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const translations = [
      {en: 'of the display', uz: 'Displey mavjud'},
      {en: 'the fast heating list', uz: 'Tez qizish'},
      {en: 'the overheating protection list', uz: 'Haddan tashqari issiqlikdan himoya'},
      {en: 'the automatic shutdown list', uz: 'Avtomatik o\'chish'}
  ];
  
  const { data: allVals } = await supabase.from('product_param_values').select('id, value');
  for (const item of allVals) {
      if (!item.value) continue;
      let newVal = item.value;
      let changed = false;
      for (const t of translations) {
          if (newVal.toLowerCase().includes(t.en)) {
              newVal = newVal.replace(new RegExp(t.en, 'gi'), t.uz);
              changed = true;
          }
      }
      
      // Fix 6W to 60W for the straightener
      if (newVal === '6') {
          newVal = '60';
          changed = true;
      }
      
      if (changed) {
          await supabase.from('product_param_values').update({ value: newVal }).eq('id', item.id);
      }
  }
  
  const { data: params } = await supabase.from('category_params').select('id, predefined_values');
  for (const p of params) {
      if (!p.predefined_values) continue;
      let newPre = [];
      let changed = false;
      for (let v of p.predefined_values) {
          let newVal = v;
          for (const t of translations) {
              if (newVal.toLowerCase().includes(t.en)) {
                  newVal = newVal.replace(new RegExp(t.en, 'gi'), t.uz);
                  changed = true;
              }
          }
          if (newVal === '6') { newVal = '60'; changed = true; }
          newPre.push(newVal);
      }
      if (changed) {
          await supabase.from('category_params').update({ predefined_values: [...new Set(newPre)] }).eq('id', p.id);
      }
  }
  console.log('Fixed completely!');
}
fix();
