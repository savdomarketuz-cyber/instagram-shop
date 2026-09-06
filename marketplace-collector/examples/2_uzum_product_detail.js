/**
 * Misol 2: Mahsulot ID bo'yicha to'liq kartasini olish
 */
const { UzumSDK } = require('../index');

async function run() {
  const uzum = new UzumSDK();

  const productId = 1403916; // VGR V-030
  console.log(`--- Uzum Market: Mahsulot kartasi (ID: ${productId}) ---`);

  const prodUz = await uzum.getProduct(productId, 'uz-UZ');
  console.log('\n[UZBEK]');
  console.log('Nomi:', prodUz?.title);
  console.log('Kategoriya:', prodUz?.category?.title);
  console.log('Rasmlar soni:', prodUz?.images?.length);

  const prodRu = await uzum.getProduct(productId, 'ru-RU');
  console.log('\n[RUSSIAN]');
  console.log('Название:', prodRu?.title);
}

run().catch(console.error);
