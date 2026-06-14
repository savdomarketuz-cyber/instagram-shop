const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

console.warn = () => {};
console.error = () => {};

const file = 'D:\\Desktop\\yangi mahsulotlar\\mahsulotlar_export_2026-06-08_with_params.xlsx';

async function run() {
    if (!fs.existsSync(file)) {
        console.log("File does not exist.");
        return;
    }
    const wb = xlsx.readFile(file);
    console.log("Sheet names:", wb.SheetNames);
    
    // Check sheets for products containing blender
    for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
        console.log(`Sheet "${sheetName}" has ${data.length} rows.`);
        
        let matchCount = 0;
        data.forEach((row, idx) => {
            const rowStr = JSON.stringify(row).toLowerCase();
            if (rowStr.includes('blender')) {
                matchCount++;
                if (matchCount <= 5) {
                    console.log(`  Row ${idx + 1}: ${JSON.stringify(row).substring(0, 150)}`);
                }
            }
        });
        console.log(`Total rows containing 'blender' in sheet "${sheetName}": ${matchCount}`);
    }
}

run().catch(console.error);
