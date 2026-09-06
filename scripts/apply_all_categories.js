const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const categoryOrder = [
  '406',              // Trimmerlar (106)
  '401',              // Epilyatorlar (60)
  '403',              // Fenlar (47)
  '404',              // Soch dazmollari (37)
  '402',              // Fen-shotkalar (8)
  '1780990168256771', // Portativ kalonkalar (8)
  '405',              // Soch turmaklash (Styler) (7)
  '303',              // Quloqchinlar (5)
  '1785864351977'     // Shtativlar va tripodlar (4)
];

async function applyAll() {
  let totalUpdated = 0;

  for (const catId of categoryOrder) {
    const jsonPath = path.join(__dirname, `category_${catId}_results.json`);
    if (!fs.existsSync(jsonPath)) continue;

    const { cat, results } = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`\nApplying updates for ${cat.name} (${results.length} products)...`);

    let catUpdated = 0;
    for (const r of results) {
      const { error } = await supabase
        .from('products')
        .update({
          name: r.name_ru,
          name_uz: r.name_uz,
          name_ru: r.name_ru
        })
        .eq('id', r.id);

      if (error) {
        console.error(`Error updating product ${r.id} (${r.model}):`, error.message);
      } else {
        catUpdated++;
      }
    }

    console.log(`Updated ${catUpdated}/${results.length} in ${cat.name}`);
    totalUpdated += catUpdated;
  }

  console.log(`\n==================================================`);
  console.log(`TOTAL PRODUCTS UPDATED IN SUPABASE: ${totalUpdated}/282`);
  console.log(`==================================================\n`);
}

applyAll().catch(console.error);
