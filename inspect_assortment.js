const xlsx = require('xlsx'); 
const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx'); 

wb.SheetNames.forEach(sheetName => {
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});
    console.log(`\n=== Sheet: ${sheetName} ===`);
    console.log('Total rows:', data.length);
    for(let i=0; i<Math.min(5, data.length); i++) {
        console.log(`Row ${i}:`, data[i]);
    }
});
