const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const rootDir = 'D:\\Desktop';

function scanDir(dir, foundFiles = []) {
    try {
        const list = fs.readdirSync(dir);
        for (const item of list) {
            const fullPath = path.join(dir, item);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch (e) {
                continue; // Skip broken links/permissions
            }
            
            if (stat.isDirectory()) {
                // Skip common system/code directories to speed up search
                if (item === 'node_modules' || item === '.git' || item === '.next' || item === 'asosiy dasturlar' || item === 'flutter_sdk') {
                    continue;
                }
                scanDir(fullPath, foundFiles);
            } else if (stat.isFile() && item.endsWith('.xlsx')) {
                foundFiles.push(fullPath);
            }
        }
    } catch (e) {
        // Skip unreadable directories
    }
    return foundFiles;
}

async function run() {
    console.log(`Scanning D:\\Desktop recursively for .xlsx files...`);
    const allFiles = scanDir(rootDir);
    console.log(`Found ${allFiles.length} total .xlsx files.`);
    
    for (const f of allFiles) {
        try {
            const wb = xlsx.readFile(f, { bookSheets: true });
            if (wb.SheetNames.length > 2) {
                console.log(`\n- File: ${f}`);
                console.log(`  Sheets (${wb.SheetNames.length}):`, wb.SheetNames);
                
                // Inspect index 2
                const wbFull = xlsx.readFile(f);
                const sheet = wbFull.Sheets[wb.SheetNames[2]];
                const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
                const firstCell = data[0] ? data[0][0] : null;
                console.log(`  Sheet[2] ("${wb.SheetNames[2]}") first cell: "${firstCell}"`);
            }
        } catch (e) {
            // Ignore error reading file structure
        }
    }
    console.log("\nScan complete.");
}

run();
