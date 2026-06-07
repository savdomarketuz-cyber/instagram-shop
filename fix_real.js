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
  
  const { data: allVals, error: fetchErr } = await supabase.from('product_param_values').select('*');
  if (fetchErr) return console.error('Fetch err', fetchErr);
  
  let count = 0;
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
      
      // Also the user wants 6 deleted from Quvvat
      if (newVal === '6' || newVal === '60') {
          const { data: paramInfo } = await supabase.from('category_params').select('name_uz').eq('id', item.param_id).single();
          if (paramInfo && paramInfo.name_uz === 'Quvvat, Vt') {
              // delete it entirely
              const { error } = await supabase.from('product_param_values').delete().eq('id', item.id);
              if (error) console.error('Delete error', error);
              else count++;
              continue; // skip update
          }
      }
      
      if (changed) {
          const { error } = await supabase.from('product_param_values').update({ value: newVal }).eq('id', item.id);
          if (error) console.error('Update err', error);
          else count++;
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
          if (newVal === '6' || newVal === '60') {
              // skip keeping it
              changed = true;
              continue;
          }
          newPre.push(newVal);
      }
      if (changed) {
          await supabase.from('category_params').update({ predefined_values: [...new Set(newPre)] }).eq('id', p.id);
      }
  }
  console.log(`Updated or deleted ${count} rows successfully!`);
}
fix();
