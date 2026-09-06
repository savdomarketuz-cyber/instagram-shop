const fs = require('fs');
const path = require('path');
const { processCategory, generateFallback } = require('./search_category_titles');

const categoriesToProcess = [
  '401',              // Epilyatorlar (60)
  '403',              // Fenlar (47)
  '404',              // Soch dazmollari (37)
  '402',              // Fen-shotkalar (8)
  '1780990168256771', // Portativ kalonkalar (8)
  '405',              // Soch turmaklash (Styler) (7)
  '303',              // Quloqchinlar (5)
  '1785864351977'     // Shtativlar va tripodlar (4)
];

async function runAll() {
  for (const catId of categoriesToProcess) {
    console.log(`\n==================================================`);
    console.log(`Starting category ID: ${catId}...`);
    const { cat, results } = await processCategory(catId);

    // Sanitize multi-model spam or non-brand matches
    results.forEach(r => {
      const vCount = (r.name_uz.match(/\b(v|km|cr|gm|kp|pamf)[- ]?\d+/gi) || []).length;
      if (vCount > 1 || r.name_uz.includes(',') && r.name_uz.split(',').length > 3) {
        const fb = generateFallback(cat.name, r.brand, r.model, r.color);
        r.name_uz = fb.uz;
        r.name_ru = fb.ru;
        r.source = 'STANDARDIZED';
      }
    });

    const uzumCount = results.filter(r => r.source === 'UZUM_EXACT').length;
    const genCount = results.filter(r => r.source === 'STANDARDIZED').length;

    console.log(`Category: ${cat.name} (${results.length} total) | Matched: ${uzumCount}, Generated: ${genCount}`);

    const outPath = path.join(__dirname, `category_${catId}_results.json`);
    fs.writeFileSync(outPath, JSON.stringify({ cat, results }, null, 2), 'utf-8');
    console.log(`Saved to ${outPath}`);
  }
  console.log('\nAll remaining categories processed successfully!');
}

runAll().catch(console.error);
