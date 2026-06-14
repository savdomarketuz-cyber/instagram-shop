const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("=== Calculating Database Blender Products Matching Percentage ===\n");
    
    // 1. Fetch active products in categories 501 and 17809901663251
    const { data: dbProducts, error } = await supabase
        .from('products')
        .select('id, name, sku, category_id')
        .eq('is_deleted', false)
        .in('category_id', ['501', '17809901663251']);
        
    if (error) {
        console.error(error);
        return;
    }
    
    const totalBlenders = dbProducts.length;
    console.log(`Total active blender products in database: ${totalBlenders}`);
    
    // Let's check which ones have parameter values in product_param_values
    let matchedCount = 0;
    const matchedProducts = [];
    const unmatchedProducts = [];
    
    for (const p of dbProducts) {
        const { data: pv, error: pvErr } = await supabase
            .from('product_param_values')
            .select('id')
            .eq('product_id', p.id)
            .limit(1);
            
        if (pvErr) {
            console.error(pvErr);
            continue;
        }
        
        if (pv && pv.length > 0) {
            matchedCount++;
            matchedProducts.push(p);
        } else {
            unmatchedProducts.push(p);
        }
    }
    
    const percentage = ((matchedCount / totalBlenders) * 100).toFixed(1);
    
    console.log(`Matched products (with parameters): ${matchedCount}`);
    console.log(`Unmatched products (no parameters yet): ${totalBlenders - matchedCount}`);
    console.log(`\nMatch Percentage: ${percentage}%`);
    
    console.log(`\n--- Unmatched Database Products ---`);
    unmatchedProducts.forEach(p => {
        console.log(`- SKU: ${p.sku} | Name: ${p.name} | Cat ID: ${p.category_id}`);
    });
}

run();
