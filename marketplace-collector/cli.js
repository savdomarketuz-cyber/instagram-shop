#!/usr/bin/env node

const path = require('path');
const { UzumSDK } = require('./uzum');
const Exporter = require('./storage/exporter');
const ImageDownloader = require('./storage/imageDownloader');

const uzum = new UzumSDK();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
🛒 MARKETPLACE COLLECTOR CLI — Uzum Market API Suite
=====================================================

Mavjud buyruqlar:

1. Uzum Marketda mahsulotlarni qidirish:
   node cli.js uzum:search <query> [--limit 20] [--lang uz|ru] [--save output.json]
   Misol: node cli.js uzum:search "VGR V-030" --lang uz

2. Ikki tilda (UZ & RU) bir vaqtda qidirish:
   node cli.js uzum:bilingual <query> [--limit 10]
   Misol: node cli.js uzum:bilingual "VGR V-107"

3. Mahsulot ID bo'yicha to'liq ma'lumot olish:
   node cli.js uzum:product <productId> [--lang uz|ru]
   Misol: node cli.js uzum:product 1403916

4. Kategoriya daraxti va toifalarni ko'rish:
   node cli.js uzum:categories [searchQuery]
   Misol: node cli.js uzum:categories "texnika"

5. Kategoriya bo'yicha mahsulotlarni olish:
   node cli.js uzum:cat-products <categoryId> [--limit 24]
   Misol: node cli.js uzum:cat-products 10094

6. Mahsulot rasmlarini yuklab olish:
   node cli.js uzum:download-images <productId> [--out ./images]
   Misol: node cli.js uzum:download-images 1403916
`);
    return;
  }

  const getArg = (flag, defaultValue = null) => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) {
      return args[idx + 1];
    }
    return defaultValue;
  };

  switch (command) {
    case 'uzum:search': {
      const query = args[1];
      if (!query) return console.error('Xatolik: Qidiruv so\'zini kiriting!');
      const limit = Number(getArg('--limit', 10));
      const lang = getArg('--lang', 'uz') === 'ru' ? 'ru-RU' : 'uz-UZ';
      const savePath = getArg('--save');

      console.log(`Qidirilmoqda: "${query}" (Til: ${lang}, Cheklov: ${limit})...`);
      const res = await uzum.searchProducts(query, { limit, lang });
      console.log(`\nJami topildi: ${res.total} ta mahsulot (Ko'rsatilgan: ${res.items.length} ta)`);
      
      res.items.forEach((item, idx) => {
        console.log(`\n${idx + 1}. [ID: ${item.productId}] ${item.title}`);
        console.log(`   Narxi: ${item.price ? item.price.toLocaleString() + ' so\'m' : 'N/A'} | Reyting: ${item.rating || 'N/A'} (${item.feedbackCount || 0} ta sharh)`);
        console.log(`   Havola: ${item.url}`);
      });

      if (savePath) {
        Exporter.saveToJson(res, path.resolve(savePath));
        console.log(`\nNatija saqlandi: ${savePath}`);
      }
      break;
    }

    case 'uzum:bilingual': {
      const query = args[1];
      if (!query) return console.error('Xatolik: Qidiruv so\'zini kiriting!');
      const limit = Number(getArg('--limit', 5));

      console.log(`Bilingual qidiruv: "${query}"...`);
      const res = await uzum.searchBilingual(query, { limit });

      console.log(`\n--- 🇺🇿 O'ZBEKCHA NATIJALAR (${res.uz.items.length} ta) ---`);
      res.uz.items.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.title} — ${item.price ? item.price.toLocaleString() + ' so\'m' : ''}`);
      });

      console.log(`\n--- 🇷🇺 RUSCHA NATIJALAR (${res.ru.items.length} ta) ---`);
      res.ru.items.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.title} — ${item.price ? item.price.toLocaleString() + ' so\'m' : ''}`);
      });
      break;
    }

    case 'uzum:product': {
      const productId = args[1];
      if (!productId) return console.error('Xatolik: Product ID kiriting!');
      const lang = getArg('--lang', 'uz') === 'ru' ? 'ru-RU' : 'uz-UZ';

      console.log(`Mahsulot ma'lumotlari olinmoqda (ID: ${productId})...`);
      const prod = await uzum.getProduct(productId, lang);
      if (!prod) return console.log('Mahsulot topilmadi.');

      console.log(`\n================ MAHSULOT KARTASI ================`);
      console.log(`Nomi: ${prod.title}`);
      console.log(`ID: ${prod.productId}`);
      console.log(`Kategoriya: ${prod.category?.title || 'N/A'}`);
      console.log(`Reyting: ${prod.rating} (${prod.feedbackCount} sharh, ${prod.ordersCount || 0} buyurtma)`);
      console.log(`SKU variantlar soni: ${prod.skus?.length || 0}`);
      console.log(`Rasmlar soni: ${prod.images?.length || 0}`);
      if (prod.images?.length > 0) {
        console.log(`Bosh rasm: ${prod.images[0]}`);
      }
      console.log(`==================================================\n`);
      break;
    }

    case 'uzum:categories': {
      const q = args[1] || '';
      console.log(`Kategoriyalar olinmoqda...`);
      const res = await uzum.getCategories(q);
      console.log(`\nTopilgan kategoriyalar soni: ${res.categories.length}`);
      res.categories.slice(0, 20).forEach((c, idx) => {
        console.log(`${idx + 1}. [ID: ${c.id}] ${c.title} (${c.totalProducts || 0} ta mahsulot)`);
      });
      break;
    }

    case 'uzum:cat-products': {
      const catId = args[1];
      if (!catId) return console.error('Xatolik: Kategoriya ID kiriting!');
      const limit = Number(getArg('--limit', 15));

      console.log(`Kategoriya ID ${catId} bo'yicha mahsulotlar olinmoqda...`);
      const res = await uzum.category.getProductsByCategory(catId, { limit });
      console.log(`\nJami: ${res.total} ta mahsulot`);
      res.items.forEach((item, idx) => {
        console.log(`${idx + 1}. [ID: ${item.productId}] ${item.title} — ${item.price ? item.price.toLocaleString() + ' so\'m' : ''}`);
      });
      break;
    }

    case 'uzum:download-images': {
      const productId = args[1];
      if (!productId) return console.error('Xatolik: Product ID kiriting!');
      const outDir = path.resolve(getArg('--out', `./downloads/product_${productId}`));

      console.log(`Mahsulot rasmlari yuklab olinmoqda (ID: ${productId})...`);
      const prod = await uzum.getProduct(productId);
      if (!prod || !prod.images || prod.images.length === 0) {
        return console.log('Rasmlar topilmadi.');
      }

      console.log(`${prod.images.length} ta rasm yuklab olinmoqda -> ${outDir}...`);
      const batch = prod.images.map((url, i) => ({ url, name: `prod_${productId}`, index: i + 1 }));
      const results = await ImageDownloader.downloadBatch(batch, outDir);
      console.log(`Muvaffaqiyatli yuklandi: ${results.filter(r => r.success).length}/${results.length}`);
      break;
    }

    default:
      console.log(`Noma'lum buyruq: ${command}. Yordam uchun: node cli.js --help`);
  }
}

main().catch(console.error);
