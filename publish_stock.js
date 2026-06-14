const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const excludeSkus = [
  'UAKEEN ZL-11', 'UAKEEN ZL-12', 'UAKEEN ZL-13', 
  'UAKEEN ZL-25', 'UAKEEN ZL-28', 'UAKEEN ZL-10', 
  'UAKEEN ZL-29', 'UAKEEN BLENDER B', 'UAKEEN BLENDER Q'
].map(s => s.toLowerCase());

async function run() {
  console.log("Fetching recently added products to update stock...");
  const { data, error } = await supabase.from('products').select('id, sku, created_at');
  if(error) {
      console.error(error);
      return;
  }
  
  const today = new Date();
  const recent = data.filter(d => {
     const dDate = new Date(d.created_at);
     const isToday = dDate.getDate() === today.getDate() && dDate.getMonth() === today.getMonth() && dDate.getFullYear() === today.getFullYear();
     const isNotExcluded = !excludeSkus.includes((d.sku||'').toLowerCase());
     return isToday && isNotExcluded;
  });
  
  console.log(`Found ${recent.length} products to publish and update stock.`);
  
  let count = 0;
  for(let item of recent) {
      const { error: updateErr } = await supabase.from('products')
          .update({ stock: 10, is_deleted: false })
          .eq('id', item.id);
          
      if(updateErr) {
          console.error(`Error updating stock for ${item.sku}:`, updateErr);
      } else {
          count++;
          if (count % 10 === 0) console.log(`Updated stock for ${count} items...`);
      }
  }
  
  console.log(`\nDone! Successfully set stock to 10 for ${count} products. They are now published for sale!`);
}

run().catch(console.error);
