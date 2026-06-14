const xlsx = require('xlsx'); 
const wb = xlsx.readFile('D:/Desktop/Yangi jild/mass_business_content_template_216615303_09-06-2026.xlsx'); 
const data = xlsx.utils.sheet_to_json(wb.Sheets["Mahsulot ma'lumotlari"], {header: 1}); 
for(let i=0; i<8; i++) {
  console.log('Row ' + i + ':', data[i] ? data[i].slice(0, 15) : 'null');
}
