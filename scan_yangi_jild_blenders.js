const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'D:\\Desktop\\Yangi jild';

async function run() {
    console.log("Searching for blender categories in Yangi jild...");
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
                const firstCell = data[0] ? String(data[0][0]) : "";
                
                if (firstCell.toLowerCase().includes('blender') || firstCell.toLowerCase().includes('chopper') || firstCell.toLowerCase().includes('maydalagich')) {
                    // Count products
                    let headerRowIndex = -1;
                    for(let i=0; i<10; i++) {
                        if(data[i] && data[i].includes('Mahsulot nomi *')) { headerRowIndex = i; break; }
                    }
                    
                    let prodCount = 0;
                    if (headerRowIndex !== -1) {
                        const headers = data[headerRowIndex];
                        const nameIdx = headers.indexOf('Mahsulot nomi *');
                        for(let i = headerRowIndex + 2; i < data.length; i++) {
                            const row = data[i];
                            if(row && row[nameIdx] && !String(row[nameIdx]).includes('Agar bir nechta') && !String(row[nameIdx]).includes('Sxemaga e\'tibor')) {
                                prodCount++;
                            }
                        }
                    }
                    
                    console.log(`File: ${f}`);
                    console.log(`  Category Raw: "${firstCell}"`);
                    console.log(`  Row count: ${data.length}`);
                    console.log(`  Products count: ${prodCount}`);
                    console.log("--------------------------------------");
                }
            }
        } catch (e) {
            // Ignore error
        }
    }
}

run().catch(console.error);
