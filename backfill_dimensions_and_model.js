const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const dir = 'D:\\Desktop\\yangi mahsulotlar';

async function backfill() {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.includes('tayyor'));

    for (const f of files) {
        console.log(`\nProcessing file: ${f}`);
        const wb = xlsx.readFile(path.join(dir, f));
        const sheetName = wb.SheetNames[2];
        const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});

        let headerRowIndex = -1;
        for(let i=0; i<10; i++) {
            if(data[i] && data[i].includes('Mahsulot nomi *')) { headerRowIndex = i; break; }
        }
        if (headerRowIndex === -1) continue;

        const headers = data[headerRowIndex];
        const hIdx = (name) => headers.indexOf(name);
        
        for(let i = headerRowIndex + 2; i < data.length; i++) {
            const row = data[i];
            if(!row || row.length === 0 || !row[hIdx('Mahsulot nomi *')]) continue;
            
            const name = row[hIdx('Mahsulot nomi *')];
            if(name.includes('Agar bir nechta') || name.includes('Sxemaga e\'tibor') || name.includes('qoidalarga')) continue;
            
            let sku = row[hIdx('Sizning SKU *')];
            if (!sku) continue;

            // Extract dimensions
            let length = row[hIdx('Uzunlik, mm')] || "";
            let width = row[hIdx('Kengligi, mm')] || "";
            let height = row[hIdx('Balandligi, mm')] || "";
            
            let packageDims = row[hIdx("Paket bilan o'lchamlari, sm")];
            if (packageDims && typeof packageDims === 'string' && packageDims.includes('/')) {
                const parts = packageDims.split('/');
                if (!length && parts[0]) length = parts[0];
                if (!width && parts[1]) width = parts[1];
                if (!height && parts[2]) height = parts[2];
            }

            // Fallback weight to g if kg not available
            let weight = row[hIdx('Paket bilan vazn, kg')] || row[hIdx("Og'irligi, g")] || "";

            // Extract model from SKU or Name. 
            // Often SKU is "BRAND MODEL COLOR" or "BRAND/MODEL"
            let modelStr = "";
            let brandName = row[hIdx('Brend *')];
            if (sku) {
                let skuParts = sku.replace(brandName, '').replace(/\//g, ' ').split('-');
                if (skuParts.length > 1) {
                    modelStr = skuParts.slice(0, skuParts.length - 1).join('-').trim();
                    if (!modelStr) modelStr = skuParts[0].trim();
                } else {
                    modelStr = skuParts[0].trim();
                }
            }
            if(!modelStr || modelStr.length < 2) {
                // Try from name e.g. "styler BC-9090" -> BC-9090
                const match = name.match(/[A-Z0-9]{2,}-\d{2,}/i);
                if (match) modelStr = match[0];
            }

            const updatePayload = {
                model: modelStr || null,
                length: length ? String(length) : null,
                width: width ? String(width) : null,
                height: height ? String(height) : null,
                weight: weight ? String(weight) : null
            };

            const { error } = await supabase.from('products').update(updatePayload).eq('sku', sku);
            if (error) {
                console.error(`Error updating SKU ${sku}:`, error);
            } else {
                console.log(`Updated SKU ${sku}: Model=${updatePayload.model}, L=${updatePayload.length}, W=${updatePayload.width}, H=${updatePayload.height}`);
            }
        }
    }
    console.log("Done backfilling.");
}

backfill();
