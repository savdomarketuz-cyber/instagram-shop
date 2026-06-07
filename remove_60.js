const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function removeSixty() {
  const { data: qParams } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Quvvat, Vt');
  
  if (qParams) {
      for (const p of qParams) {
          // Delete from product_param_values
          await supabase.from('product_param_values').delete().match({ param_id: p.id, value: '60' });
          
          // Remove from predefined_values
          if (p.predefined_values && p.predefined_values.includes('60')) {
              const newVals = p.predefined_values.filter(v => v !== '60');
              await supabase.from('category_params').update({ predefined_values: newVals }).eq('id', p.id);
          }
      }
      console.log('Successfully removed 60 from Quvvat, Vt');
  }
}
removeSixty();
