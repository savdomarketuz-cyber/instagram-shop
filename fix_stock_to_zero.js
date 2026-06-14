const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const WAREHOUSE_ID = "4183d79b-692e-4d65-bfdf-a0036a213da2";

async function run() {
  console.log("Fetching products to set general stock to 0...");
  const { data, error } = await supabase.from('products').select('id, sku, stock, stock_details');
  if(error) {
      console.error(error);
      return;
  }
  
  let count = 0;
  for(let item of data) {
      // Check if stock is 10 and we have stock_details for the warehouse
      if(item.stock === 10 && item.stock_details && item.stock_details[WAREHOUSE_ID] >= 10) {
          const { error: updateErr } = await supabase.from('products')
              // Set general stock to 0, keeping stock_details intact
              .update({ stock: 0 })
              .eq('id', item.id);
              
          if(!updateErr) count++;
      }
  }
  
  console.log(`\nDone! Successfully set general 'stock' to 0 for ${count} products, keeping warehouse stock_details intact.`);
}

run().catch(console.error);
