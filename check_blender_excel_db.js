const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dir = 'D:\\Desktop\\Yangi jild';
const mappings = [
    {
        file: 'mass_business_content_template_216615303_09-06-2026(10).xlsx',
        dbCategoryId: '501',
        name: 'Blenderlar (Statsionar)'
    },
    {
        file: 'mass_business_content_template_216615303_09-06-2026(20).xlsx',
        dbCategoryId: '501',
        name: 'Blenderlar (Portativ)'
    },
    {
        file: 'mass_business_content_template_216615303_09-06-2026.xlsx',
        dbCategoryId: '17809901663251',
        name: 'Qo\'l blenderlari'
    }
];

async function run() {
    // Fetch active products in DB
    const { data: dbProducts, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_uz, sku')
        .eq('is_deleted', false);
        
    if (prodError) {
        console.error("Error fetching products:", prodError);
        return;
    }
    
    console.log(`Loaded ${dbProducts.length} active products from database.\n`);
    
    for (const mapping of mappings) {
        const filePath = path.join(dir, mapping.file);
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${mapping.file}`);
            continue;
        }
        
        console.log(`=== Analyzing: ${mapping.file} (${mapping.name}) ===`);
        const wb = xlsx.readFile(filePath);
        const sheetName = wb.SheetNames[2];
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
        
        let headerRowIndex = -1;
        for(let i=0; i<10; i++) {
            if(data[i] && data[i].includes('Mahsulot nomi *')) { 
                headerRowIndex = i; 
                break; 
            }
        }
        
        if (headerRowIndex === -1) {
            console.log(`  Could not find header row. Skipping.`);
            continue;
        }
        
        const headers = data[headerRowIndex];
        const nameIdx = headers.indexOf('Mahsulot nomi *');
        const skuIdx = headers.indexOf('Sizning SKU *');
        
        let totalRows = 0;
        const matched = [];
        const unmatched = [];
        
        for(let i = headerRowIndex + 2; i < data.length; i++) {
            const row = data[i];
            if(!row || row.length === 0 || !row[nameIdx]) continue;
            if(row[nameIdx].includes('Agar bir nechta') || row[nameIdx].includes('Sxemaga e\'tibor')) continue;
            
            totalRows++;
            const excelName = row[nameIdx].trim();
            const excelSku = row[skuIdx] ? row[skuIdx].trim() : '';
            
            let dbProduct = dbProducts.find(p => p.sku && p.sku.trim().toUpperCase() === excelSku.toUpperCase());
            if (!dbProduct) {
                dbProduct = dbProducts.find(p => p.name && p.name.trim().toLowerCase() === excelName.toLowerCase());
            }
            
            if (dbProduct) {
                matched.push({ excelName, excelSku, dbProduct });
            } else {
                unmatched.push({ excelName, excelSku });
            }
        }
        
        console.log(`  Total rows in Excel sheet: ${totalRows}`);
        console.log(`  Matched in DB: ${matched.length}`);
        console.log(`  Unmatched (Not in DB): ${unmatched.length}`);
        
        if (unmatched.length > 0) {
            console.log("  Sample unmatched rows:");
            unmatched.slice(0, 5).forEach(u => {
                console.log(`    - SKU: "${u.excelSku}" | Name: "${u.excelName}"`);
            });
        }
        console.log();
    }
}

run().catch(console.error);
