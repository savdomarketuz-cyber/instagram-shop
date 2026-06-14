const xlsx = require('xlsx'); 
const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');

// 1. Categories from Enums sheet
const enumsData = xlsx.utils.sheet_to_json(wb.Sheets['Enums'], {header: 1});
const allCategories = new Set();
enumsData.forEach((row, i) => {
   if(i > 1 && row[3]) allCategories.add(String(row[3]).trim());
});

// 2. Categories from Mahsulotlar ro'yxati (assigned to SKUs)
const dataSheet = wb.Sheets["Mahsulotlar ro'yxati"];
const keys = Object.keys(dataSheet).filter(k => k[0] !== '!');
const maxRow = Math.max(...keys.map(k => parseInt(k.replace(/\D/g, '')) || 0));
const maxCol = Math.max(...keys.map(k => xlsx.utils.decode_cell(k).c));
dataSheet['!ref'] = xlsx.utils.encode_range({s: {r: 0, c: 0}, e: {r: maxRow, c: maxCol}});

const skuData = xlsx.utils.sheet_to_json(dataSheet, {header: 1});
const catIdx = skuData[1].indexOf('Bozordagi kategoriya');
const skuIdx = skuData[1].indexOf('Sizning SKU *');

const targetCats = [
  'бытовая техника / техника для красоты / машинки для стрижки и триммеры / триммеры для волос',
  'товары для дома / посуда и кухонные принадлежности / приготовление напитков / заварочные чайники / чайники заварочные',
  'бытовая техника / мелкая техника для кухни / приготовление блюд / блинницы',
  'бытовая техника / техника для красоты / фены и фен-щётки / фены для волос',
  'товары для дома / посуда и кухонные принадлежности / приготовление пищи / аксессуары для готовки / миксеры и блендеры механические',
  'бытовая техника / мелкая техника для кухни / приготовление напитков / кофеварки и кофемашины / автоматические кофемашины',
  'дача, сад и огород / бассейны и аксессуары / пылесосы / запчасти к пылесосу для бассейна',
  'бытовая техника / техника для красоты / весы напольные / напольные весы',
  'бытовая техника / мелкая техника для кухни / измельчение и смешивание / блендеры / блендеры портативные',
  'бытовая техника / техника для дома / техника для уборки / пылесосы напольные и ручные / напольные пылесосы',
  'оборудование / чистящая и моющая техника / промышленные пылесосы и парогенераторы / пылесосы промышленные / промышленные и строительные пылесосы'
];

console.log('--- 11 ta maxsus kategoriya va ularning SKU kodlari ---');

skuData.forEach((row, i) => {
   if(i > 2 && row[skuIdx]) {
       const catName = String(row[catIdx] || 'Aniqlanmagan').trim();
       if (targetCats.includes(catName)) {
           console.log(`Kategoriya: ${catName}`);
           console.log(`SKU: ${row[skuIdx]}\n`);
       }
   }
});
