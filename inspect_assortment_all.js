const xlsx = require('xlsx'); 
const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');

wb.SheetNames.forEach(sheetName => {
    console.log(`\n=== Sheet: ${sheetName} ===`);
    const d = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});
    console.log('Total rows:', d.length);
    for(let i=0; i<Math.min(3, d.length); i++) {
        console.log(`Row ${i}:`, d[i].slice(0, 5));
    }
});
