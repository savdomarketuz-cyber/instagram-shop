const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, name_uz');
        
    if (catError) {
        console.error(catError);
        return;
    }
    
    const { data: params, error: paramError } = await supabase
        .from('category_params')
        .select('category_id');
        
    if (paramError) {
        console.error(paramError);
        return;
    }
    
    console.log("=== Category Parameters Count in DB ===");
    console.log(`Total parameters in database: ${params.length}`);
    
    const counts = {};
    params.forEach(p => {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });
    
    categories.forEach(c => {
        const count = counts[String(c.id)] || 0;
        console.log(`Category: ${c.name_uz || c.name} (ID: ${c.id}) | Params in DB: ${count}`);
    });
}

run();
