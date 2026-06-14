const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TARGET_STOCK_DETAILS = {
    "4183d79b-692e-4d65-bfdf-a0036a213da2": 0,
    "a034ba3c-c747-437e-a1aa-1ea7c4e0d645": 0,
    "c289340d-33c1-41bc-8db2-3542673687dc": 0,
    "d8b4c41f-5fbd-4ae9-a7ce-a18da4c32422": 20
};

async function run() {
  console.log("Fetching products to replicate the proper stock structure...");
  
  const { data, error } = await supabase.from('products').select('id, stock, stock_details');
  if(error) {
      console.error(error);
      return;
  }
  
  let count = 0;
  for(let item of data) {
      // Check if we need to update this item
      // We check if the stock_details stringified matches our target, or if stock != 20
      let currentDetailsStr = JSON.stringify(item.stock_details || {});
      let targetDetailsStr = JSON.stringify(TARGET_STOCK_DETAILS);
      
      if(item.stock !== 20 || currentDetailsStr !== targetDetailsStr) {
          const { error: updateErr } = await supabase.from('products')
              .update({ stock: 20, stock_details: TARGET_STOCK_DETAILS })
              .eq('id', item.id);
              
          if(updateErr) {
              console.error(`Error updating product ${item.id}:`, updateErr);
          } else {
              count++;
              if(count % 50 === 0) console.log(`Replicated structure for ${count} items...`);
          }
      }
  }
  
  console.log(`\nDone! Successfully updated ${count} products to the exact stock structure with 20 pieces.`);
}

run().catch(console.error);
