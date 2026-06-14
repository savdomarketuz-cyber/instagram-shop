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
        file: 'mass_business_content_template_216615303_09-06-2026.xlsx',
        dbCategoryId: '17809901663251',
        name: 'Qo\'l blenderlari'
    }
];

async function run() {
    console.log("=== Blender Product Matching Debugger ===\n");
    
    const { data: dbProducts, error } = await supabase
        .from('products')
        .select('id, name, name_uz, sku, category_id')
        .eq('is_deleted', false);
        
    if (error) {
        console.error(error);
        return;
    }
    
    // Filter database products in category 501 and 17809901663251
    const dbBlenders = dbProducts.filter(p => p.category_id === '501' || p.category_id === '17809901663251');
    
    console.log(`Active Blender products in Database (${dbBlenders.length}):`);
    dbBlenders.forEach(p => {
        console.log(`  - SKU: "${p.sku}" | Name (UZ): "${p.name_uz || p.name}" | Cat ID: ${p.category_id}`);
    });
    
    for (const mapping of mappings) {
        const filePath = path.join(dir, mapping.file);
        if (!fs.existsSync(filePath)) continue;
        
        console.log(`\nAnalyzing file: ${mapping.file} (${mapping.name})...`);
        const wb = xlsx.readFile(filePath);
        const sheet = wb.Sheets[wb.SheetNames[2]];
        const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
        
        let headerRowIndex = -1;
        for(let i=0; i<10; i++) {
            if(data[i] && data[i].includes('Mahsulot nomi *')) { 
                headerRowIndex = i; 
                break; 
            }
        }
        
        if (headerRowIndex === -1) continue;
        
        const headers = data[headerRowIndex];
        const nameIdx = headers.indexOf('Mahsulot nomi *');
        const skuIdx = headers.indexOf('Sizning SKU *');
        
        for(let i = headerRowIndex + 2; i < data.length; i++) {
            const row = data[i];
            if(!row || row.length === 0 || !row[nameIdx]) continue;
            if(row[nameIdx].includes('Agar bir nechta') || row[nameIdx].includes('Sxemaga e\'tibor')) continue;
            
            const excelName = row[nameIdx].trim();
            const excelSku = row[skuIdx] ? row[skuIdx].trim() : '';
            
            let match = dbProducts.find(p => p.sku === excelSku);
            if (!match) {
                match = dbProducts.find(p => p.name.trim().toLowerCase() === excelName.toLowerCase());
            }
            
            if (match) {
                console.log(`  [MATCHED] Excel SKU: "${excelSku}" / Name: "${excelName}" matches DB product SKU: "${match.sku}"`);
            } else {
                console.log(`  [MISMATCHED] Excel SKU: "${excelSku}" | Name: "${excelName}"`);
            }
        }
    }
}

run();
