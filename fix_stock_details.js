const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const WAREHOUSE_ID = "4183d79b-692e-4d65-bfdf-a0036a213da2";

async function run() {
  console.log("Fetching products to fix stock_details...");
  const { data, error } = await supabase.from('products').select('id, sku, stock, stock_details');
  if(error) {
      console.error(error);
      return;
  }
  
  // We want to fix any product where stock > 0 but stock_details doesn't have the warehouse stock
  let count = 0;
  for(let item of data) {
      if(item.stock > 0) {
          let details = item.stock_details || {};
          let currentWarehouseStock = details[WAREHOUSE_ID];
          
          if(currentWarehouseStock != item.stock) {
              details[WAREHOUSE_ID] = item.stock;
              
              const { error: updateErr } = await supabase.from('products')
                  .update({ stock_details: details })
                  .eq('id', item.id);
                  
              if(!updateErr) count++;
          }
      }
  }
  
  console.log(`\nDone! Successfully fixed stock_details (warehouse stock) for ${count} products.`);
}

run().catch(console.error);
