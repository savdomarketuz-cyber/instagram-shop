const fs = require('fs');
const xlsx = require('xlsx');

const largeExcelPath = 'D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx';
const wb = xlsx.readFile(largeExcelPath);
const sheet = wb.Sheets["Mahsulotlar ro'yxati"];

const keys = Object.keys(sheet).filter(k => k[0] !== '!');
const maxRow = Math.max(...keys.map(k => parseInt(k.replace(/\D/g, '')) || 0));
const maxCol = Math.max(...keys.map(k => xlsx.utils.decode_cell(k).c));
sheet['!ref'] = xlsx.utils.encode_range({s: {r: 0, c: 0}, e: {r: maxRow, c: maxCol}});

const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
const headers = data[1];

// SKUs that we have already inserted
const processedSkus = [
    'UAKEEN ZL-1503', 'SONIFER SF-8142', 'UAKEEN PLISOS ZL-930', 
    'UAKEEN PLISOS ZL-928', 'SONIFER SF-2246', 'SONIFER SF-8125', 
    'SONIFER SF-1908', 'SONIFER SF-3055', 'SONIFER SF-211',
    'SONIFER SF-2111', 'SONIFER SF-2112', 'SONIFER SF-2113', 'SONIFER SF-2114'
].map(s => s.toLowerCase());

let cleanData = [];

for(let i=2; i<data.length; i++) {
    const row = data[i];
    if(!row) continue;
    
    let item = {
        sku: '',
        name_ru: '',
        name_uz_latin: '',
        category: '',
        desc_ru: '',
        desc_uz_latin: '',
        price: 0,
        old_price: 0,
        brand: '',
        model: '',
        images: [],
        weight: '',
        dimensions: '',
        parameters: {}
    };
    
    headers.forEach((h, colIdx) => {
        let hLower = String(h).toLowerCase().trim();
        let v = row[colIdx] ? String(row[colIdx]).trim() : '';
        if(!v || v === 'undefined') return;
        
        if(hLower === 'sizning sku *') item.sku = v;
        else if(hLower === 'mahsulot nomi *') item.name_ru = v;
        else if(hLower === "o'zbek tilidagi nomi lotin *") item.name_uz_latin = v;
        else if(hLower === 'bozordagi kategoriya *') item.category = v;
        else if(hLower === 'mahsulot tavsifi *') item.desc_ru = v;
        else if(hLower === "lotin tilida o'zbek tilidagi tavsif *") item.desc_uz_latin = v;
        else if(hLower === 'narxi *') item.price = parseFloat(v);
        else if(hLower === 'chizilgan narx') item.old_price = parseFloat(v);
        else if(hLower === 'brend *') item.brand = v;
        else if(hLower === 'rasmga havola *' && v.includes('http')) item.images = v.split(',').map(s=>s.trim()).filter(Boolean);
        else if(hLower === 'paket bilan vazn, kg') item.weight = v;
        else if(hLower === "paket bilan o'lchamlari, sm") item.dimensions = v;
        else {
            // Unrecognized fields go into parameters
            const ignore = ['valyuta', 'ikpu', 'kartaning sifati', 'bozordagi', 'kartani', 'video'];
            if(!ignore.some(ig => hLower.includes(ig)) && v.length < 50 && !hLower.includes('http')) {
                item.parameters[h] = v;
            }
        }
    });
    
    if(!item.sku) continue;
    
    let isProcessed = processedSkus.find(ps => item.sku.toLowerCase().includes(ps));
    if(!isProcessed) {
        // Find model
        let bMatch = item.name_ru.match(/([a-zA-Z]{3,})/);
        let bName = item.brand || (bMatch ? bMatch[1] : item.sku.split(' ')[0]);
        let mMatch = item.sku.match(/([A-Z0-9-]{3,})/g);
        let mName = (mMatch && mMatch.length > 1) ? mMatch[1] : item.sku.replace(bName, '').trim();
        item.model = mName;
        item.brand = bName;
        
        cleanData.push(item);
    }
}

const outPath = 'D:/Desktop/qolgan_mahsulotlar_toza.json';
fs.writeFileSync(outPath, JSON.stringify(cleanData, null, 2));

console.log(`Successfully converted ${cleanData.length} items to clean JSON.`);
console.log(`Saved to: ${outPath}`);
