/**
 * Misol 1: Uzum Marketda mahsulotlarni qidirish
 */
const { UzumSDK, Exporter } = require('../index');
const path = require('path');

async function run() {
  const uzum = new UzumSDK();

  console.log('--- Uzum Marketda "Trimmer VGR" qidiruvi ---');
  const result = await uzum.searchProducts('Trimmer VGR', {
    limit: 10,
    lang: 'uz-UZ',
    sort: 'BY_RELEVANCE_DESC'
  });

  console.log(`Topildi: ${result.total} ta mahsulot`);
  result.items.forEach((p, i) => {
    console.log(`${i + 1}. [ID: ${p.productId}] ${p.title}`);
    console.log(`   Narxi: ${p.price ? p.price.toLocaleString() + ' so\'m' : 'N/A'}`);
    console.log(`   Havola: ${p.url}\n`);
  });

  const outPath = path.join(__dirname, '../downloads/vgr_search_results.json');
  Exporter.saveToJson(result, outPath);
  console.log(`Natijalar faylga saqlandi: ${outPath}`);
}

run().catch(console.error);
