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
    
    // Row 2 (index 2) usually has keys, or index 1, or index 0. 
    // In import_products_from_excel.js, I mapped it directly:
    // Let's find the header row by searching for 'Sizning SKU *'
    let headerRowIdx = -1;
    for (let i = 0; i < 5; i++) {
        if (data[i] && data[i].some(c => cleanString(c).includes('SKU'))) {
            headerRowIdx = i;
            break;
        }
    }
    
    if (headerRowIdx === -1) return console.log("Header row not found");
    const keys = data[headerRowIdx];
    
    let articleIdx = -1;
    let priceIdx = -1;
    let oldPriceIdx = -1;
    
    for (let i = 0; i < keys.length; i++) {
        const k = cleanString(keys[i]);
        if (k === 'Sizning SKU *') articleIdx = i;
        if (k === 'Narxi *' || k === 'Narxi') priceIdx = i;
        if (k === 'Chizilgan narx') oldPriceIdx = i;
    }
    
    console.log(`Indices -> Article: ${articleIdx}, Price: ${priceIdx}, OldPrice: ${oldPriceIdx}`);
    
    const excelProducts = new Map();
    for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        const article = cleanString(row[articleIdx]);
        if (article) {
            const pRaw = String(row[priceIdx] || '').replace(/[^0-9]/g, '');
            const opRaw = String(row[oldPriceIdx] || '').replace(/[^0-9]/g, '');
            
            excelProducts.set(article, {
                price: Number(pRaw) || 0,
                oldPrice: Number(opRaw) || null
            });
        }
    }
    
    console.log(`Found ${excelProducts.size} valid rows in Excel.`);
    
    // Fetch products from DB
    const { data: dbProducts, error } = await supabase.from('products')
        .select('id, article, price, old_price')
        .like('image', '%savdomarketimag/products/%');
        
    if (error) return console.error("DB Error:", error);
    
    let updated = 0;
    
    for (const p of dbProducts) {
        if (!p.article) continue;
        const excelData = excelProducts.get(p.article);
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
            
            // Update DB with the discounted price, but keeping the original old_price intact.
            // If the user wants `oldPrice` to remain EXACTLY as it was in the Excel, we set it.
            // What if `oldPrice` was null in Excel? Then we set it to `originalPrice` so the UI shows the cross out?
            // Actually, if they want "undan avvalgi qimmaty narxlar bor ediku old price unga tegish kerak ema edi", 
            // it means they want exactly `originalOldPrice` if it existed, otherwise maybe they didn't have any.
            // Let's just set `old_price: originalOldPrice`.
            
            const finalOldPrice = originalOldPrice; // Do not touch or auto-generate! Keep exactly as imported.
            
            const { error: upErr } = await supabase.from('products')
                .update({
                    price: newPrice,
                    old_price: finalOldPrice
                })
                .eq('id', p.id);
                
            if (upErr) console.error(`Error updating ${p.id}:`, upErr);
            else updated++;
        }
    }
    
    console.log(`Successfully restored and re-discounted ${updated} products.`);
}

restorePrices();
