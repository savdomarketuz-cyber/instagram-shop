const xlsx = require('xlsx'); 
const fs = require('fs');

const dir = 'D:/Desktop/Yangi jild/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
let totalRows = 0;
let categories = new Set();
let imagesCount = 0;

const wb = xlsx.readFile(dir + files[0]);
const data = xlsx.utils.sheet_to_json(wb.Sheets["Mahsulot ma'lumotlari"], {header: 1});

console.log('Headers (Row 2):', data[1]);
console.log('Sample Row (Row 3):', data[2]);

files.forEach(f => {
  try {
     const wbAll = xlsx.readFile(dir + f);
     const dataAll = xlsx.utils.sheet_to_json(wbAll.Sheets["Mahsulot ma'lumotlari"], {header: 1});
     for(let i=2; i<dataAll.length; i++) {
        const row = dataAll[i];
        if(row && (row[0] || row[1] || row[10] || row[8])) {
            totalRows++;
            if(row[6]) categories.add(row[6]);
            if(row[17]) imagesCount++;
        }
     }
  } catch(e) {
     console.log('Error reading', f);
  }
});

console.log('Total files:', files.length);
console.log('Total valid product rows:', totalRows);
console.log('Rows with images:', imagesCount);
console.log('Categories found:', Array.from(categories));
