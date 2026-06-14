const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const colorsDict = {
    'oq': 'Oq', 'white': 'Oq',
    'qora': 'Qora', 'black': 'Qora',
    'qizil': 'Qizil', 'red': 'Qizil',
    'ko\'k': 'Ko\'k', 'ko`k': 'Ko\'k', 'blue': 'Ko\'k',
    'to\'q ko\'k': 'To\'q ko\'k', 'dark blue': 'To\'q ko\'k',
    'havorang': 'Havorang', 'light blue': 'Havorang',
    'bronza': 'Bronza', 'bronze': 'Bronza',
    'bej': 'Bej', 'beige': 'Bej',
    'pushti': 'Pushti', 'pink': 'Pushti',
    'yashil': 'Yashil', 'green': 'Yashil',
    'sariq': 'Sariq', 'yellow': 'Sariq',
    'kulrang': 'Kulrang', 'grey': 'Kulrang', 'gray': 'Kulrang',
    'oltin': 'Oltin', 'gold': 'Oltin'
};

function extractColor(text) {
    if(!text) return null;
    let lower = text.toLowerCase();
    for(let [key, val] of Object.entries(colorsDict)) {
        // use word boundary or exact match
        if(lower.includes(key)) {
            return val;
        }
    }
    return null;
}

async function run() {
  console.log("Fetching products to group variants...");
  const { data, error } = await supabase.from('products').select('id, sku, name, name_uz, model, brand_id, group_id, color_name');
  if(error) {
      console.error(error);
      return;
  }
  
  // Group by brand_id + model
  const groups = {};
  for(let item of data) {
      if(!item.model || !item.brand_id) continue;
      let key = `${item.brand_id}_${item.model}`;
      if(!groups[key]) groups[key] = [];
      groups[key].push(item);
  }
  
  // Only process groups that have more than 1 item
  let duplicateGroups = Object.entries(groups).filter(g => g[1].length > 1);
  console.log(`Found ${duplicateGroups.length} valid groups (same brand & model) with multiple items.`);
  
  let updatedCount = 0;
  
  for(let [key, items] of duplicateGroups) {
      // Find the best group_id to unify them
      // Prefer a group_id that is already set and not just a random UUID if possible,
      // but to be safe, let's just use the group_id of the first item
      let unifiedGroupId = items[0].group_id;
      if(!unifiedGroupId) {
          unifiedGroupId = require('crypto').randomUUID();
      }
      
      for(let item of items) {
          let updates = {};
          
          if(item.group_id !== unifiedGroupId) {
              updates.group_id = unifiedGroupId;
          }
          
          if(!item.color_name || item.color_name === 'null' || !isNaN(item.color_name)) {
              // Extract color
              let color = extractColor(item.sku) || extractColor(item.name_uz) || extractColor(item.name);
              if(color) {
                  updates.color_name = color;
              }
          }
          
          if(Object.keys(updates).length > 0) {
              const { error: updateErr } = await supabase.from('products')
                  .update(updates)
                  .eq('id', item.id);
                  
              if(updateErr) {
                  console.error(`Error updating ${item.sku}:`, updateErr);
              } else {
                  updatedCount++;
                  console.log(`Updated ${item.sku} -> group_id: ${updates.group_id || 'same'}, color_name: ${updates.color_name || 'same'}`);
              }
          }
      }
  }
  
  console.log(`\nDone! Updated grouping and colors for ${updatedCount} variant items.`);
}

run().catch(console.error);
