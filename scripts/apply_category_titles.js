const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyCategory(categoryId) {
  const jsonPath = path.join(__dirname, `category_${categoryId}_results.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    return;
  }

  const { cat, results } = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Applying updates for ${cat.name} (${results.length} products)...`);

  let updated = 0;
  for (const r of results) {
    const { error } = await supabase
      .from('products')
      .update({
        name: r.name_ru, // Russian as default standard
        name_uz: r.name_uz,
        name_ru: r.name_ru
      })
      .eq('id', r.id);

    if (error) {
      console.error(`Error updating product ${r.id} (${r.model}):`, error.message);
    } else {
      updated++;
    }
  }

  console.log(`Successfully updated ${updated}/${results.length} products in database.`);
}

const targetCat = process.argv[2] || '406';
applyCategory(targetCat).catch(console.error);
