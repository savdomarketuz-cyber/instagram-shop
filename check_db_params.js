const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkParams() {
    // 1. Find category "Soch dazmollari"
    const { data: cat } = await supabase.from('categories')
        .select('id, name, name_uz')
        .ilike('name_uz', '%Soch dazmollari%')
        .single();
        
    if (!cat) return console.log("Category 'Soch dazmollari' not found");
    console.log(`Found category: ${cat.name_uz} (ID: ${cat.id})`);
    
    // 2. Check category_params for this category
    const { data: catParams } = await supabase.from('category_params')
        .select('*')
        .eq('category_id', cat.id);
        
    console.log(`Parameters linked to this category: ${catParams ? catParams.length : 0}`);
    if (catParams && catParams.length > 0) {
        console.log("Category Params:", catParams);
    }
    
    // 3. Find a product in this category
    const { data: prod } = await supabase.from('products')
        .select('id, name, article')
        .eq('category_id', cat.id)
        .limit(1)
        .single();
        
    if (prod) {
        console.log(`Found product: ${prod.name} (ID: ${prod.id})`);
        
        // 4. Check product_param_values
        const { data: prodParams } = await supabase.from('product_param_values')
            .select('*')
            .eq('product_id', prod.id);
            
        console.log(`Parameter values for this product: ${prodParams ? prodParams.length : 0}`);
        if (prodParams && prodParams.length > 0) {
            console.log("Product Params:", prodParams);
        }
    }
}

checkParams();
