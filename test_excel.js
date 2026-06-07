const xlsx = require('xlsx'); 
const wb = xlsx.readFile('D:\\Desktop\\yangi mahsulotlar\\mass_business_content_template_216615282_07-06-2026(1).xlsx'); 
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[2]], {header: 1}); 
let hIdx = -1; 
for(let i=0; i<10; i++) { 
    if(data[i] && data[i].includes('Mahsulot nomi *')) { hIdx = i; break; } 
} 
const headers = data[hIdx]; 
const getCol = (name) => headers.indexOf(name); 
const row = data[hIdx+4]; 
console.log({ 
    name: row[getCol('Mahsulot nomi *')], 
    weight: row[getCol('Paket bilan vazn, kg')], 
    weight2: row[getCol("Og'irligi, g")], 
    length: row[getCol('Uzunlik, mm')], 
    width: row[getCol('Kengligi, mm')], 
    height: row[getCol('Balandligi, mm')], 
    length2: row[getCol("Paket bilan o'lchamlari, sm")],
    article: row[getCol('Ishlab chiqaruvchining maqolasi')],
    model: row[getCol('Model')] || row[getCol('Turi')] || row[getCol('Hukmdor')]
});
