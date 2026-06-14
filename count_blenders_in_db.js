const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // Fetch categories
    const { data: categories, error: catErr } = await supabase
        .from('categories')
        .select('id, name, name_uz, parent_id');
        
    if (catErr) {
        console.error("Error categories:", catErr);
        return;
    }
    
    const blenderCats = categories.filter(c => 
        (c.name && c.name.toLowerCase().includes('blender')) ||
        (c.name_uz && c.name_uz.toLowerCase().includes('blender'))
    );
    
    console.log("\n--- Blender-related Categories in DB ---");
    for (const c of blenderCats) {
        console.log(`ID: ${c.id} | Name: ${c.name} | UzName: ${c.name_uz} | Parent: ${c.parent_id}`);
    }
    
    // Fetch active products in these categories
    const blenderCatIds = blenderCats.map(c => c.id);
    if (blenderCatIds.length > 0) {
        const { data: activeProds, error: prodErr } = await supabase
            .from('products')
            .select('id, name, sku, category_id, is_deleted')
            .in('category_id', blenderCatIds)
            .eq('is_deleted', false);
            
        if (prodErr) {
            console.error("Error products:", prodErr);
            return;
        }
        
        console.log(`\nActive Blender Products in DB: ${activeProds.length}`);
        for (const p of activeProds) {
            console.log(`- ID: ${p.id} | SKU: ${p.sku} | Name: ${p.name} | Cat: ${p.category_id}`);
        }
        
        const { data: deletedProds, error: delErr } = await supabase
            .from('products')
            .select('id, name, sku, category_id, is_deleted')
            .in('category_id', blenderCatIds)
            .eq('is_deleted', true);
            
        console.log(`\nDeleted Blender Products in DB: ${deletedProds ? deletedProds.length : 0}`);
    } else {
        console.log("No blender categories found.");
    }
}

run();
