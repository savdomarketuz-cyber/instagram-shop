const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const excludeSkus = [
  'UAKEEN ZL-11', 'UAKEEN ZL-12', 'UAKEEN ZL-13', 
  'UAKEEN ZL-25', 'UAKEEN ZL-28', 'UAKEEN ZL-10', 
  'UAKEEN ZL-29', 'UAKEEN BLENDER B', 'UAKEEN BLENDER Q'
].map(s => s.toLowerCase());

async function run() {
  console.log("Fetching recently added products...");
  const { data, error } = await supabase.from('products').select('id, sku, price, old_price, created_at');
  if(error) {
      console.error(error);
      return;
  }
  
  const today = new Date();
  const recent = data.filter(d => {
     const dDate = new Date(d.created_at);
     // Filter products created today
     const isToday = dDate.getDate() === today.getDate() && dDate.getMonth() === today.getMonth() && dDate.getFullYear() === today.getFullYear();
     // Exclude the 9 test items just to be safe
     const isNotExcluded = !excludeSkus.includes((d.sku||'').toLowerCase());
     return isToday && isNotExcluded;
  });
  
  console.log(`Found ${recent.length} products to discount.`);
  
  let count = 0;
  for(let item of recent) {
      // Apply 5% discount
      const discountedPrice = Math.floor(item.price * 0.95);
      
      // We also set the old_price to the original price, so the user can see the discount visually
      const oldPrice = item.old_price && item.old_price > item.price ? item.old_price : item.price;
      
      const { error: updateErr } = await supabase.from('products')
          .update({ price: discountedPrice, old_price: oldPrice })
          .eq('id', item.id);
          
      if(updateErr) {
          console.error(`Error updating ${item.sku}:`, updateErr);
      } else {
          count++;
          if (count % 10 === 0) console.log(`Updated ${count} items...`);
      }
  }
  
  console.log(`\nDone! Successfully applied a 5% discount to ${count} products.`);
}

run().catch(console.error);
