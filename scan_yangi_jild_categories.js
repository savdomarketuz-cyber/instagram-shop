const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'D:\\Desktop\\Yangi jild';

async function run() {
    console.log("=== Scanning Categories in Yangi jild Excel files ===");
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
    
    for (const f of files) {
        const fullPath = path.join(dir, f);
        try {
            const wb = xlsx.readFile(fullPath, { bookSheets: true });
            const sheetName = wb.SheetNames[2];
            if (sheetName) {
                const wbFull = xlsx.readFile(fullPath);
                const sheet = wbFull.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
                const firstCell = data[0] ? data[0][0] : null;
                console.log(`File: ${f} -> Category Raw: "${firstCell}"`);
            }
        } catch (e) {
            console.error(`Error processing ${f}:`, e.message);
        }
    }
}

run();
