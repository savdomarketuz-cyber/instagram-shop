const fs = require('fs');
const xlsx = require('xlsx');

const dir = 'D:/Desktop/Yangi jild/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

const targetSkus = [
    'Sonifer SF-211', 'Sonifer SF-3055', 'UAKEEN ZL-1503', 
    'SONIFER SF-8142', 'UAKEEN PLISOS ZL-930', 'UAKEEN PLISOS ZL-928', 
    'SONIFER SF-2246', 'SONIFER SF-8125', 'Sonifer SF-1908'
].map(s => s.toLowerCase());

let foundProducts = {};

files.forEach(f => {
    const wb = xlsx.readFile(dir + f);
    const sheet = wb.Sheets["Mahsulot ma'lumotlari"];
    if (!sheet) return;
    
    const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
    if (data.length < 3) return;
    
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
    
    if(headerRowIdx === -1) return;
    const headers = data[headerRowIdx];
    
    data.forEach((row, rowIndex) => {
        if(rowIndex <= headerRowIdx) return;
        
        let skuVal = row[skuColIdx] ? String(row[skuColIdx]).toLowerCase().trim() : '';
        let foundSku = targetSkus.find(target => skuVal.includes(target));
        
        if(foundSku && !foundProducts[skuVal]) {
            let info = {
                sku: row[skuColIdx],
                name_ru: false, name_uz: false,
                desc_ru: false, desc_uz: false,
                price: false, old_price: false,
                brand: false, model: false, // Model and brand usually extracted from Name or SKU
                color: false, weight: false, dimensions: false,
                parameters: false
            };
            
            // Assume Brand and Model can be parsed from SKU
            if(info.sku) {
                info.brand = true; 
                info.model = true;
            }
            
            let paramCount = 0;
            
            headers.forEach((h, colIdx) => {
                let headerText = String(h || '').trim().toLowerCase();
                let val = String(row[colIdx] || '').trim();
                
                if(val && val !== 'undefined') {
                    if(headerText.includes('mahsulot nomi *')) info.name_ru = true;
                    if(headerText.includes('o\'zbek tilidagi nomi lotin')) info.name_uz = true;
                    if(headerText.includes('mahsulot tavsifi *')) info.desc_ru = true;
                    if(headerText.includes('lotin tilida o\'zbek tilidagi tavsif')) info.desc_uz = true;
                    if(headerText.includes('narxi *')) info.price = true;
                    if(headerText.includes('chizilgan narx')) info.old_price = true;
                    if(headerText.includes('rang')) info.color = true;
                    if(headerText.includes('vazn') || headerText.includes('og\'irlik')) info.weight = true;
                    if(headerText.includes('o\'lcham')) info.dimensions = true;
                    
                    // Parameters (anything not standard)
                    const ignore = ['sku', 'nomi', 'tavsifi', 'rasm', 'narx', 'valyuta', 'kategoriya', 'shtrix', 'brend', 'model', 'havola', 'video', 'chizilgan'];
                    let isIgnored = ignore.some(ig => headerText.includes(ig));
                    if(!isIgnored && val.length < 50 && !headerText.includes('http')) {
                        paramCount++;
                    }
                }
            });
            
            if(paramCount > 0) info.parameters = true;
            
            foundProducts[skuVal] = info;
        }
    });
});

console.log(JSON.stringify(foundProducts, null, 2));
