/**
 * Misol 4: Ikki tilda (UZ & RU) qidirish va CSV formatida eksport qilish
 */
const { UzumSDK, Exporter } = require('../index');
const path = require('path');

async function run() {
  const uzum = new UzumSDK();
  const query = 'Kemei';

  console.log(`--- "${query}" brendi bo'yicha bilingual qidiruv va eksport ---`);
  const res = await uzum.searchBilingual(query, { limit: 10 });

  const exportRows = [];
  const count = Math.min(res.uz.items.length, res.ru.items.length);

  for (let i = 0; i < count; i++) {
    const uzItem = res.uz.items[i];
    const ruItem = res.ru.items[i];

    exportRows.push({
      productId: uzItem.productId,
      title_uz: uzItem.title,
      title_ru: ruItem.title,
      price: uzItem.price,
      rating: uzItem.rating,
      feedbackCount: uzItem.feedbackCount,
      url: uzItem.url
    });
  }

  const outCsv = path.join(__dirname, '../downloads/kemei_bilingual.csv');
  Exporter.saveToCsv(exportRows, outCsv);
  console.log(`\n${exportRows.length} ta mahsulot CSV ga eksport qilindi: ${outCsv}`);
}

run().catch(console.error);
