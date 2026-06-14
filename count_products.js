const xlsx = require('xlsx'); 
const fs = require('fs');

const dir = 'D:/Desktop/Yangi jild/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
let totalNames = 0;
let namesList = [];

files.forEach(f => {
  const wb = xlsx.readFile(dir + f);
  const data = xlsx.utils.sheet_to_json(wb.Sheets["Mahsulot ma'lumotlari"], {header: 1});
  
  for(let i=0; i<data.length; i++) {
     const row = data[i];
     if(!row) continue;
     
     // Look for image URL in the row to confirm it's a product row
     let isProductRow = false;
     for(let col=0; col<30; col++) {
         let val = row[col] ? String(row[col]) : '';
         if (val.length > 10 && val.includes('http') && (val.includes('yandex') || val.includes('uzum'))) {
             isProductRow = true;
             break;
         }
     }
     
     if (isProductRow) {
         let name = String(row[6] || row[0] || row[1] || 'Unknown');
         if(name.length > 5 && !name.includes('http')) {
             totalNames++;
             namesList.push(name);
         }
     }
  }
});

console.log('Total actual products found across all files:', totalNames);
console.log('First 5:', namesList.slice(0,5));
