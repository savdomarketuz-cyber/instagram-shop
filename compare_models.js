const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(str) {
    if (!str) return '';
    return String(str).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function compare() {
    // 1. Read Excel models
    const wb = xlsx.readFile('D:\\Desktop\\velari narx\\extracted_products.xlsx');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    const excelModels = new Set();
    data.forEach(row => {
        if (row['Model']) {
            excelModels.add(normalize(row['Model']));
            // Also add with brand just in case
            if (row['Brand']) {
                 excelModels.add(normalize(row['Brand'] + row['Model']));
            }
        }
    });

    // 2. Fetch new products from DB
    const { data: newProducts, error } = await supabase.from('products')
        .select('sku, model, name, brand_id')
        .like('image', '%savdomarketimag/products/%');
        
    const { data: brands } = await supabase.from('brands').select('id, name');
        
    if (error) {
        console.error("DB Error:", error);
        return;
    }

    const missingInExcel = [];
    const missingByBrand = {};
    
    newProducts.forEach(p => {
        let dbModel = p.model || '';
        let normDbModel = normalize(dbModel);
        let skuNorm = normalize(p.sku);
        
        // If the model itself isn't found, try combining it with the brand name or just checking if the sku is in excel
        if (!excelModels.has(normDbModel) && !excelModels.has(skuNorm)) {
             const brand = brands.find(b => b.id === p.brand_id);
             missingInExcel.push({
                 brand: brand ? brand.name : 'Brendsiz',
                 model: dbModel,
                 sku: p.sku
             });
        }
    });

    // Group by brand
    missingInExcel.forEach(m => {
        if (!missingByBrand[m.brand]) missingByBrand[m.brand] = new Set();
        missingByBrand[m.brand].add(m.model);
    });

    console.log(`\nFound ${newProducts.length} new products in DB.`);
    console.log(`Found ${excelModels.size} unique normalized models in Excel.\n`);
    
    console.log('--- MODELS IN DB BUT MISSING IN EXCEL ---');
    if (missingInExcel.length === 0) {
        console.log('None! All new models exist in the Excel file.');
    } else {
        for (const [brand, models] of Object.entries(missingByBrand)) {
            console.log(`\n** ${brand} ** (${models.size} ta model)`);
            console.log([...models].join(', '));
        }
    }
}
compare();
