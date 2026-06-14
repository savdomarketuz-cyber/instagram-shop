const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const searchDirs = [
    'D:\\Desktop',
    'D:\\Desktop\\yangi mahsulotlar',
    'D:\\Desktop\\uzum yangi mahsulotlar'
];

async function run() {
    console.log("=== Searching for Excel Files with Category Sheets ===");
    
    for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) {
            console.log(`Directory does not exist: ${dir}`);
            continue;
        }
        
        console.log(`\nScanning directory: ${dir}`);
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isFile() && item.endsWith('.xlsx')) {
                try {
                    const wb = xlsx.readFile(fullPath, { bookSheets: true });
                    const sheetNames = wb.SheetNames;
                    console.log(`- File: ${item}`);
                    console.log(`  Sheets:`, sheetNames);
                    
                    // If sheet index 2 exists, let's check its name
                    if (sheetNames.length > 2) {
                        console.log(`  >>> Found workbook with 3+ sheets! Sheet index 2: "${sheetNames[2]}"`);
                    }
                } catch (err) {
                    console.log(`- Error reading file ${item}: ${err.message}`);
                }
            }
        }
    }
}

run();
