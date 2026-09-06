/**
 * Misol 3: Kategoriyalar daraxti va toifa mahsulotlari
 */
const { UzumSDK } = require('../index');

async function run() {
  const uzum = new UzumSDK();

  console.log('--- Uzum Market: Kategoriya daraxti ---');
  const catTree = await uzum.getCategories('Go\'zallik');
  console.log('Topilgan toifalar soni:', catTree.categories.length);

  catTree.categories.slice(0, 10).forEach(c => {
    console.log(`- [${c.id}] ${c.title} (Jami mahsulot: ${c.totalProducts})`);
  });

  if (catTree.categories.length > 0) {
    const firstCat = catTree.categories[0];
    console.log(`\n--- [${firstCat.title}] toifasidagi mahsulotlar ---`);
    const prods = await uzum.category.getProductsByCategory(firstCat.id, { limit: 5 });
    prods.items.forEach(p => {
      console.log(`* ${p.title} -> ${p.price ? p.price.toLocaleString() + ' so\'m' : ''}`);
    });
  }
}

run().catch(console.error);
