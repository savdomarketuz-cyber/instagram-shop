const xlsx = require('xlsx');
const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');
const dataSheet = wb.Sheets["Mahsulotlar ro'yxati"];
const keys = Object.keys(dataSheet).filter(k => k[0] !== '!');
const maxRow = Math.max(...keys.map(k => parseInt(k.replace(/\D/g, '')) || 0));
const maxCol = Math.max(...keys.map(k => xlsx.utils.decode_cell(k).c));
dataSheet['!ref'] = xlsx.utils.encode_range({s: {r: 0, c: 0}, e: {r: maxRow, c: maxCol}});

const skuData = xlsx.utils.sheet_to_json(dataSheet, {header: 1});
const skuIdx = skuData[1].indexOf('Sizning SKU *');
const catIdx = skuData[1].indexOf('Bozordagi kategoriya');
const nameIdx = skuData[1].indexOf('Nomi *');
const descIdx = skuData[1].indexOf('Tavsifi *');

const targetSkus = ['UAKEEN PLISOS ZL-930', 'SONIFER SF-2246'];

skuData.forEach((row, i) => {
   if(i > 2 && row[skuIdx] && targetSkus.includes(String(row[skuIdx]).trim())) {
       console.log('--- Mahsulot: ' + String(row[skuIdx]).trim() + ' ---');
       console.log('Kategoriya:', row[catIdx]);
       // Since headers are not an object but an array, we must map them
       const headers = skuData[1];
       headers.forEach((h, colIdx) => {
           if(h && row[colIdx]) {
               const val = String(row[colIdx]);
               if(val.length > 50) {
                   console.log(`${h}: ${val.substring(0, 100)}...`);
               } else {
                   console.log(`${h}: ${val}`);
               }
           }
       });
       console.log('\n');
   }
});
