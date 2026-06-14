const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'D:\\Desktop\\yangi mahsulotlar';

async function run() {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
    
    for (const f of files) {
        console.log(`\n============================`);
        console.log(`File: ${f}`);
        const wb = xlsx.readFile(path.join(dir, f));
        console.log(`Sheets in workbook:`, wb.SheetNames);
        
        // Let's check Sheet 3 (index 2) as used by import script
        const sheetName = wb.SheetNames[2];
        if (sheetName) {
            const sheet = wb.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
            const firstCell = data[0] ? data[0][0] : null;
            console.log(`Sheet "${sheetName}" first cell: "${firstCell}"`);
            
            // Look for header row and column names
            let headerRowIndex = -1;
            for(let i=0; i<10; i++) {
                if(data[i] && data[i].includes('Mahsulot nomi *')) { 
                    headerRowIndex = i; 
                    break; 
                }
            }
            if (headerRowIndex > -1) {
                const headers = data[headerRowIndex];
                console.log(`  Header Row Index: ${headerRowIndex}`);
                console.log(`  Headers (truncated if long):`, headers.slice(0, 15), `... (${headers.length} columns)`);
            }
        } else {
            console.log(`  Sheet at index 2 does not exist.`);
        }
    }
}

run();
