# 🛒 Marketplace Collector — Uzum Market API Suite

Uzum Market platformasidan mahsulotlar ma'lumotlarini qidirish, yig'ish, tahlil qilish va eksport qilish uchun to'liq mustaqil Node.js API to'plami va CLI vositasi.

> **Eslatma:** Ushbu modul asosiy vebsayt kodlariga daxlsiz bo'lib, alohida mustaqil vosita (tool) sifatida ishlaydi.

---

## 📁 Loyiha tuzilishi

```text
marketplace-collector/
├── package.json               # Modul konfiguratsiyasi
├── README.md                  # Hujjatlar va qo'llanma
├── index.js                   # Asosiy SDK eksporti
├── config.js                  # API manzillari, tokenlar va sozlamalar
├── cli.js                     # Qulay konsol (CLI) interfeysi
├── uzum/
│   ├── client.js              # Uzum GraphQL va REST HTTP mijoz
│   ├── search.js              # Qidiruv, filtrlar, tartiblash va bilingual qidiruv
│   ├── product.js             # Mahsulot kartasi, tavsif, rasmlar, SKU va narxlar
│   ├── category.js            # Kategoriya daraxti va toifa bo'yicha mahsulotlar
│   ├── cities.js              # Shaharlar va topshirish punktlari (PVZ)
│   └── index.js               # Uzum SDK jamlanmasi
├── storage/
│   ├── exporter.js            # JSON va CSV formatida saqlash
│   └── imageDownloader.js     # Mahsulot rasmlarini parallel yuklab olish
├── examples/                  # Ishga tushirish uchun tayyor namunalar
│   ├── 1_uzum_search.js       # Qidiruv va JSON eksport
│   ├── 2_uzum_product_detail.js # Mahsulot kartasi ma'lumotlari
│   ├── 3_uzum_categories.js   # Kategoriyalar va toifa mahsulotlari
│   └── 4_bilingual_collector.js # Ikki tilda qidiruv va CSV eksport
└── downloads/                 # Yuklangan ma'lumotlar va rasmlar
```

---

## 🚀 Ishlatish bo'yicha qo'llanma

### 1. Dasturiy tarzda (Node.js SDK):

```javascript
const { UzumSDK, Exporter } = require('./marketplace-collector');

const uzum = new UzumSDK();

async function run() {
  // 1. Qidiruv (O'zbek tilida)
  const searchResult = await uzum.searchProducts('VGR V-030', {
    limit: 10,
    lang: 'uz-UZ' // yoki 'ru-RU'
  });
  console.log(searchResult.items);

  // 2. Ikki tilda (UZ va RU) bir vaqtda qidirish
  const bilingual = await uzum.searchBilingual('Kemei KM-2299');
  console.log('UZ:', bilingual.uz.items[0]?.title);
  console.log('RU:', bilingual.ru.items[0]?.title);

  // 3. Mahsulot ID bo'yicha to'liq kartasini olish
  const product = await uzum.getProduct(1403916, 'uz-UZ');
  console.log(product.title, product.description, product.images);

  // 4. Kategoriyalar daraxti
  const categories = await uzum.getCategories('Go\'zallik');
  console.log(categories.categories);

  // 5. CSV formatda saqlash
  Exporter.saveToCsv(searchResult.items, './downloads/products.csv');
}

run();
```

---

### 2. CLI (Buyruqlar paneli) orqali:

Loyihaning `marketplace-collector` papkasida turib:

#### A. Mahsulotlarni qidirish:
```bash
node cli.js uzum:search "VGR V-107" --lang uz --limit 10
```

#### B. Ikki tilda (UZ & RU) parallel qidiruv:
```bash
node cli.js uzum:bilingual "VGR V-030"
```

#### C. Mahsulot ID bo'yicha to'liq kartani ko'rish:
```bash
node cli.js uzum:product 1403916 --lang uz
```

#### D. Toifalar bo'yicha qidiruv:
```bash
node cli.js uzum:categories "texnika"
```

#### E. Mahsulot rasmlarini to'liq yuklab olish:
```bash
node cli.js uzum:download-images 1403916 --out ./downloads/vgr_images
```
