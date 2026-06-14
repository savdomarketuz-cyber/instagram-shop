const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Resetting all stock to 0 everywhere...");
  
  // We can update all products by selecting them and updating in chunks, 
  // or Supabase allows updating all rows if we don't use .eq (but it requires an empty filter or explicit ids).
  // Safest way is to fetch all IDs and update them.
  
  const { data, error } = await supabase.from('products').select('id');
  if(error) {
      console.error(error);
      return;
  }
  
  console.log(`Found ${data.length} products to reset.`);
  
  let count = 0;
  for(let item of data) {
      const { error: updateErr } = await supabase.from('products')
          .update({ stock: 0, stock_details: {} })
          .eq('id', item.id);
          
      if(updateErr) {
          console.error(`Error resetting stock for ${item.id}:`, updateErr);
      } else {
          count++;
          if(count % 50 === 0) console.log(`Reset stock for ${count} items...`);
      }
  }
  
  console.log(`\nDone! Successfully reset stock to 0 and cleared stock_details for ${count} products.`);
}

run().catch(console.error);
