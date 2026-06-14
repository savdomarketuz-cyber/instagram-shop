const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("=== Checking Blender Parameters ===");
    
    // 1. Check category_params for category_id = '501' (Blenderlar)
    const { data: catParams, error: paramError } = await supabase
        .from('category_params')
        .select('*')
        .eq('category_id', '501');
        
    if (paramError) {
        console.error("Error fetching category params:", paramError);
        return;
    }
    
    console.log(`\nFound ${catParams.length} parameters for category ID '501' (Blenderlar):`);
    catParams.forEach((cp, idx) => {
        console.log(`${idx + 1}. [${cp.id}] Name (UZ/RU): ${cp.name_uz} / ${cp.name_ru} | Type: ${cp.type} | Predefined values: ${JSON.stringify(cp.predefined_values)}`);
    });
    
    // 2. Fetch products in category '501'
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_uz, sku')
        .eq('category_id', '501')
        .eq('is_deleted', false);
        
    if (prodError) {
        console.error("Error fetching products:", prodError);
        return;
    }
    
    console.log(`\nFound ${products.length} active products in category '501':`);
    
    // 3. For each product, fetch its param values
    for (const p of products) {
        const { data: valData, error: valError } = await supabase
            .from('product_param_values')
            .select(`
                id,
                value,
                param:param_id (
                    id,
                    name_uz,
                    name_ru
                )
            `)
            .eq('product_id', p.id);
            
        if (valError) {
            console.error(`Error fetching param values for product ${p.sku}:`, valError);
            continue;
        }
        
        console.log(`- Product: ${p.sku} | ${p.name_uz || p.name}`);
        console.log(`  Parameter values (${valData.length}):`);
        valData.forEach(vd => {
            const paramName = vd.param ? `${vd.param.name_uz} (${vd.param.name_ru})` : 'Unknown Param';
            console.log(`    * ${paramName}: ${vd.value}`);
        });
    }
}

run();
