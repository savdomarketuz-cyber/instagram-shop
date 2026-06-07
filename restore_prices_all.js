const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanString(s) {
    return s ? String(s).trim() : '';
}

async function restorePrices() {
    const dir = 'D:\\Desktop\\yangi mahsulotlar';
    const files = fs.readdirSync(dir).filter(f => f.startsWith('mass_business_content') && f.endsWith('.xlsx'));
    
    const excelProducts = new Map();
    
    for (const f of files) {
        console.log(`Reading ${f}...`);
        const wb = xlsx.readFile(path.join(dir, f));
        const sheetName = wb.SheetNames[2]; // This is what import_products_from_excel.js used
        if (!sheetName) continue;
        
        const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
        
        let headerRowIdx = -1;
        for (let i = 0; i < 10; i++) {
            if (data[i] && data[i].includes('Mahsulot nomi *')) {
                headerRowIdx = i;
                break;
            }
        }
        
        if (headerRowIdx === -1) continue;
        
        const headers = data[headerRowIdx];
        const nameIdx = headers.indexOf('Mahsulot nomi *');
        const priceIdx = headers.indexOf('Narxi *') !== -1 ? headers.indexOf('Narxi *') : headers.indexOf('Narxi');
        const oldPriceIdx = headers.indexOf('Chizilgan narx');
        
        if (nameIdx === -1 || priceIdx === -1) continue;
        
        for (let i = headerRowIdx + 2; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            const name = cleanString(row[nameIdx]);
            if (name) {
                const pRaw = String(row[priceIdx] || '').replace(/[^0-9]/g, '');
                const opRaw = String(row[oldPriceIdx] || '').replace(/[^0-9]/g, '');
                
                excelProducts.set(name, {
                    price: Number(pRaw) || 0,
                    oldPrice: Number(opRaw) || 0
                });
            }
        }
    }
    
    console.log(`Found ${excelProducts.size} valid rows across all Excel files.`);
    
    // Fetch products from DB
    const { data: dbProducts, error } = await supabase.from('products')
        .select('id, name, price, old_price')
        .like('image', '%savdomarketimag/products/%');
        
    if (error) return console.error("DB Error:", error);
    
    let updated = 0;
    
    for (const p of dbProducts) {
        let excelData = excelProducts.get(p.name);
        
        if (!excelData) {
            // Fuzzy match if exact fails
            for (const [eName, eData] of excelProducts.entries()) {
                if (eName.includes(p.name) || p.name.includes(eName)) {
                    excelData = eData;
                    break;
                }
            }
        }
        
        if (excelData && excelData.price > 0) {
            const originalPrice = excelData.price;
            const originalOldPrice = excelData.oldPrice > 0 ? excelData.oldPrice : null;
            
            let discountPercent = 0;
            if (originalPrice <= 200000) discountPercent = 10;
            else if (originalPrice <= 500000) discountPercent = 7;
            else discountPercent = 5;
            
            const newPrice = Math.round(originalPrice * (1 - discountPercent / 100));
            
            const { error: upErr } = await supabase.from('products')
                .update({
                    price: newPrice,
                    old_price: originalOldPrice
                })
                .eq('id', p.id);
                
            if (upErr) console.error(`Error updating ${p.id}:`, upErr);
            else updated++;
        } else {
            console.log(`Could not find match for: ${p.name}`);
        }
    }
    
    console.log(`Successfully restored and re-discounted ${updated} products.`);
}

restorePrices();
