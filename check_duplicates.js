const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(str) {
    if (!str) return '';
    return String(str).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function checkDuplicates() {
    console.log('Fetching all products to check for duplicates...');
    const { data: products, error } = await supabase.from('products').select('id, name, sku, model, brand_id');
    
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }
    
    // Group by normalized model + brand
    const modelBrandMap = {};
    const exactSkuMap = {};
    
    for (const p of products) {
        const sku = (p.sku || '').trim().toUpperCase();
        if (sku) {
            if (!exactSkuMap[sku]) exactSkuMap[sku] = [];
            exactSkuMap[sku].push(p);
        }
        
        const nModel = normalize(p.model);
        const bId = p.brand_id || 'no_brand';
        const key = bId + '_' + nModel;
        
        if (nModel) {
             if (!modelBrandMap[key]) modelBrandMap[key] = [];
             modelBrandMap[key].push(p);
        }
    }
    
    let hasDups = false;
    
    console.log('\n--- Checking Exact SKU Duplicates ---');
    for (const [sku, prods] of Object.entries(exactSkuMap)) {
        if (prods.length > 1) {
            hasDups = true;
            console.log(`\nSKU Duplicate: "${sku}" (${prods.length} products)`);
            prods.forEach(p => console.log(` - ID: ${p.id} | Name: ${p.name} | Model: ${p.model}`));
        }
    }
    
    console.log('\n--- Checking Model+Brand Duplicates ---');
    let mbCount = 0;
    for (const [key, prods] of Object.entries(modelBrandMap)) {
        if (prods.length > 1) {
            hasDups = true;
            mbCount++;
            if (mbCount <= 10) {
                 console.log(`\nModel+Brand Duplicate: "${prods[0].model}" (${prods.length} products)`);
                 prods.forEach(p => console.log(` - ID: ${p.id} | Name: ${p.name} | SKU: ${p.sku}`));
            }
        }
    }
    if (mbCount > 10) {
        console.log(`...and ${mbCount - 10} more Model+Brand duplicates.`);
    }
    
    if (!hasDups) {
        console.log('\nNo duplicates found!');
    }
}

checkDuplicates();
