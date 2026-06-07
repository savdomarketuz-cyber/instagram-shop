const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanString(s) {
    return s ? String(s).trim() : '';
}

async function restorePrices() {
    console.log("Reading Yandex Excel file...");
    const yandexPath = 'D:\\Desktop\\yangi mahsulotlar\\mass_business_content_template_216615282_07-06-2026(1).xlsx';
    const wb = xlsx.readFile(yandexPath);
    const sheet = wb.Sheets[wb.SheetNames[2]];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let headerRowIdx = -1;
    for (let i = 0; i < 5; i++) {
        if (data[i] && data[i].some(c => cleanString(c).includes('SKU'))) {
            headerRowIdx = i;
            break;
        }
    }
    
    if (headerRowIdx === -1) return console.log("Header row not found");
    const keys = data[headerRowIdx];
    
    let nameIdx = -1;
    let priceIdx = -1;
    let oldPriceIdx = -1;
    
    for (let i = 0; i < keys.length; i++) {
        const k = cleanString(keys[i]);
        if (k === 'Mahsulot nomi *') nameIdx = i;
        if (k === 'Narxi *' || k === 'Narxi') priceIdx = i;
        if (k === 'Chizilgan narx') oldPriceIdx = i;
    }
    
    console.log(`Indices -> Name: ${nameIdx}, Price: ${priceIdx}, OldPrice: ${oldPriceIdx}`);
    
    const excelProducts = new Map();
    for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        const name = cleanString(row[nameIdx]);
        if (name) {
            const pRaw = String(row[priceIdx] || '').replace(/[^0-9]/g, '');
            const opRaw = String(row[oldPriceIdx] || '').replace(/[^0-9]/g, '');
            
            excelProducts.set(name, {
                price: Number(pRaw) || 0,
                oldPrice: Number(opRaw) || null
            });
        }
    }
    
    console.log(`Found ${excelProducts.size} valid rows in Excel.`);
    
    // Fetch products from DB
    const { data: dbProducts, error } = await supabase.from('products')
        .select('id, name, name_ru, price, old_price')
        .like('image', '%savdomarketimag/products/%');
        
    if (error) return console.error("DB Error:", error);
    
    let updated = 0;
    
    for (const p of dbProducts) {
        // Try to match by name or name_ru
        let excelData = excelProducts.get(p.name_ru || p.name);
        
        if (!excelData) {
            // Try partial match
            for (const [eName, eData] of excelProducts.entries()) {
                if (p.name_ru === eName || p.name === eName || (p.name_ru && p.name_ru.includes(eName))) {
                    excelData = eData;
                    break;
                }
            }
        }
        
        if (excelData && excelData.price > 0) {
            // Original prices from Excel
            const originalPrice = excelData.price;
            const originalOldPrice = excelData.oldPrice > 0 ? excelData.oldPrice : null;
            
            // Now apply the discount based on originalPrice ONLY!
            let discountPercent = 0;
            if (originalPrice <= 200000) discountPercent = 10;
            else if (originalPrice <= 500000) discountPercent = 7;
            else discountPercent = 5;
            
            const newPrice = Math.round(originalPrice * (1 - discountPercent / 100));
            
            const { error: upErr } = await supabase.from('products')
                .update({
                    price: newPrice,
                    old_price: originalOldPrice // RESTORE original old_price
                })
                .eq('id', p.id);
                
            if (upErr) console.error(`Error updating ${p.id}:`, upErr);
            else updated++;
        } else {
            console.log(`Could not find Excel match for: ${p.name_ru || p.name}`);
        }
    }
    
    console.log(`Successfully restored and re-discounted ${updated} products.`);
}

restorePrices();
