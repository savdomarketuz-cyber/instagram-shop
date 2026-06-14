const fs = require('fs');
const xlsx = require('xlsx');

const dir = 'D:/Desktop/Yangi jild/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

const targetSkus = [
    'Sonifer SF-211', 'Sonifer SF-3055', 'UAKEEN ZL-1503', 
    'SONIFER SF-8142', 'UAKEEN PLISOS ZL-930', 'UAKEEN PLISOS ZL-928', 
    'SONIFER SF-2246', 'SONIFER SF-8125', 'Sonifer SF-1908'
].map(s => s.toLowerCase());

files.forEach(f => {
    const wb = xlsx.readFile(dir + f);
    const sheet = wb.Sheets["Mahsulot ma'lumotlari"];
    if (!sheet) return;
    
    const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
    if (data.length < 3) return;
    
    // Yandex format usually puts the actual column names in Row 1 (index 1) or Row 2 (index 2)
    // Let's find the header row by looking for 'Sizning SKU *'
    let headerRowIdx = -1;
    let skuColIdx = -1;
    
    for(let r=0; r<5; r++) {
        if(data[r]) {
            let idx = data[r].findIndex(cell => String(cell).includes('Sizning SKU *') || String(cell).includes('Ваш SKU'));
            if(idx !== -1) {
                headerRowIdx = r;
                skuColIdx = idx;
                break;
            }
        }
    }
    
    if(headerRowIdx === -1) return; // couldn't find SKU column
    
    const headers = data[headerRowIdx];
    
    data.forEach((row, rowIndex) => {
        if(rowIndex <= headerRowIdx) return;
        
        let skuVal = row[skuColIdx] ? String(row[skuColIdx]).toLowerCase().trim() : '';
        let foundSku = targetSkus.find(target => skuVal.includes(target));
        
        if(foundSku) {
            console.log(`\n=== 25 ta Exceldan: ${row[skuColIdx]} (${f}) ===`);
            let params = [];
            
            // Exclude standard fields to only show parameters
            const ignoreHeaders = [
                'sizning sku', 'nomi', 'tavsifi', 'rasm', 'narx', 'valyuta', 
                'kategoriya', 'shtrix-kod', 'brend', 'model', 'og\'irlik', 'vazn', 
                'uzunlik', 'kenglik', 'balandlik', 'havola', 'ikpu', 'video', 'chizilgan'
            ];
            
            headers.forEach((h, colIdx) => {
                let headerText = String(h || '').trim();
                let val = String(row[colIdx] || '').trim();
                
                if(headerText && val && val.length > 0 && val !== 'undefined') {
                    let isIgnored = ignoreHeaders.some(ig => headerText.toLowerCase().includes(ig));
                    
                    if(!isIgnored && !headerText.includes('http')) {
                        params.push(` - ${headerText}: ${val}`);
                    }
                }
            });
            
            console.log(`Topilgan parametrlar soni: ${params.length} ta`);
            console.log(params.join('\n'));
        }
    });
});
