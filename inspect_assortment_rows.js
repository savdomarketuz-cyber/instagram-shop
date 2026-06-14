const xlsx = require('xlsx'); 
const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');
const d = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});

console.log('Total rows in sheet 0:', d.length);
for(let i=0; i<d.length; i++) {
  console.log(`Row ${i} SKU Col (0):`, String(d[i][0]).substring(0, 30));
  console.log(`Row ${i} Cat Col (25):`, String(d[i][25]).substring(0, 30));
}
