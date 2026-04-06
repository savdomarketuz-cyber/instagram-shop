require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const categories = [
  // Parent 1
  { id: "cat-elektronika", name: "Электроника", name_uz: "Elektronika", name_ru: "Электроника", parent_id: null, image: "https://cdn-icons-png.flaticon.com/512/3616/3616223.png" },
  // Core Electronics
  { id: "cat-smartfonlar", name: "Смартфоны", name_uz: "Smartfonlar", name_ru: "Смартфоны", parent_id: "cat-elektronika", image: "https://cdn-icons-png.flaticon.com/512/0/191.png" },
  { id: "cat-noutbuklar", name: "Ноутбуки", name_uz: "Noutbuklar", name_ru: "Ноутбуки", parent_id: "cat-elektronika", image: "https://cdn-icons-png.flaticon.com/512/3067/3067268.png" },
  { id: "cat-quloqchinlar", name: "Наушники", name_uz: "Quloqchinlar", name_ru: "Наушники", parent_id: "cat-elektronika", image: "https://cdn-icons-png.flaticon.com/512/3043/3043322.png" },
  { id: "cat-smart-soatlar", name: "Умные часы", name_uz: "Smart soatlar", name_ru: "Умные часы", parent_id: "cat-elektronika", image: "https://cdn-icons-png.flaticon.com/512/1797/1797435.png" },
  { id: "cat-televizorlar", name: "Телевизоры", name_uz: "Televizorlar", name_ru: "Телевизоры", parent_id: "cat-elektronika", image: "https://cdn-icons-png.flaticon.com/512/4011/4011116.png" },
  { id: "cat-planshetlar", name: "Планшеты", name_uz: "Planshetlar", name_ru: "Планшеты", parent_id: "cat-elektronika", image: "https://cdn-icons-png.flaticon.com/512/2633/2633857.png" },
  
  // Parent 2
  { id: "cat-maishiy-texnika", name: "Бытовая техника", name_uz: "Maishiy texnika", name_ru: "Бытовая техника", parent_id: null, image: "https://cdn-icons-png.flaticon.com/512/3133/3133379.png" },
  // Core Home Appliances
  { id: "cat-muzlatgichlar", name: "Холодильники", name_uz: "Muzlatgichlar", name_ru: "Холодильники", parent_id: "cat-maishiy-texnika", image: "https://cdn-icons-png.flaticon.com/512/3588/3588720.png" },
  { id: "cat-kir-yuvish", name: "Стиральные машины", name_uz: "Kir yuvish mashinalari", name_ru: "Стиральные машины", parent_id: "cat-maishiy-texnika", image: "https://cdn-icons-png.flaticon.com/512/5752/5752940.png" },
  { id: "cat-changyutgichlar", name: "Пылесосы", name_uz: "Changyutgichlar", name_ru: "Пылесосы", parent_id: "cat-maishiy-texnika", image: "https://cdn-icons-png.flaticon.com/512/10041/10041289.png" },
  { id: "cat-mikrotolqinli", name: "Микроволновые печи", name_uz: "Mikroto'lqinli pechlar", name_ru: "Микроволновые печи", parent_id: "cat-maishiy-texnika", image: "https://cdn-icons-png.flaticon.com/512/3071/3071988.png" },
  { id: "cat-konditsionerlar", name: "Кондиционеры", name_uz: "Konditsionerlar", name_ru: "Кондиционеры", parent_id: "cat-maishiy-texnika", image: "https://cdn-icons-png.flaticon.com/512/5781/5781489.png" }
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    for (const cat of categories) {
      await client.query(`
        INSERT INTO categories (id, name, name_uz, name_ru, parent_id, image)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET 
          name_uz = EXCLUDED.name_uz, 
          image = EXCLUDED.image,
          name_ru = EXCLUDED.name_ru;
      `, [cat.id, cat.name, cat.name_uz, cat.name_ru, cat.parent_id, cat.image]);
      console.log('Inserted:', cat.name_uz);
    }
    console.log("Successfully seeded 12 common categories with premium icons!");
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
