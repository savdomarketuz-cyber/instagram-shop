const xlsx = require('xlsx');
const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');
const sheet = wb.Sheets["Mahsulotlar ro'yxati"];
const keys = Object.keys(sheet).filter(k => k[0] !== '!');
const maxRow = Math.max(...keys.map(k => parseInt(k.replace(/\D/g, '')) || 0));
const maxCol = Math.max(...keys.map(k => xlsx.utils.decode_cell(k).c));
sheet['!ref'] = xlsx.utils.encode_range({s: {r: 0, c: 0}, e: {r: maxRow, c: maxCol}});

const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
const headers = data[1];
const skuIdx = headers.indexOf('Sizning SKU *');

const targetSkus = [
    'Sonifer SF-211', 'Sonifer SF-3055', 'UAKEEN ZL-1503', 
    'SONIFER SF-8142', 'UAKEEN PLISOS ZL-930', 'UAKEEN PLISOS ZL-928', 
    'SONIFER SF-2246', 'SONIFER SF-8125', 'Sonifer SF-1908'
];

const standardCols = ['Sizning SKU *', 'Mahsulot nomi *', 'Bozordagi kategoriya *', 'Bozordagi kategoriya', 'Mahsulot tavsifi *', 'Rasmga havola *', 'Narxi *', 'Brend *', 'Valyuta *', 'IKPU *', 'Kartaning sifati', 'Bozordagi SKU', 'Kartani to\'ldirish sanasi', 'Video havolasi', "O'zbek tilidagi nomi lotin *", "Lotin tilida o'zbek tilidagi tavsif *", "Paket bilan vazn, kg", "Paket bilan o'lchamlari, sm", "Chizilgan narx"];

data.forEach((row, i) => {
   if(i > 2 && row[skuIdx]) {
       const sku = String(row[skuIdx]).trim();
       if(targetSkus.includes(sku)) {
           console.log(`\n=== SKU: ${sku} ===`);
           let paramCount = 0;
           let paramsList = [];
           headers.forEach((h, colIdx) => {
               if(h && !standardCols.includes(h) && row[colIdx] && String(row[colIdx]).trim() !== '') {
                   paramCount++;
                   paramsList.push(`${h}: ${String(row[colIdx]).substring(0, 50)}`);
               }
           });
           console.log(`Parametrlar soni (Katta Yandex Exceldan): ${paramCount} ta`);
           if(paramCount > 0) {
               console.log(paramsList.join('\n'));
           }
       }
   }
});
