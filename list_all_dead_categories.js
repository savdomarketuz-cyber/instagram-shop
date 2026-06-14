const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("=== Analysing Dead / Orphaned Categories ===");
    
    // Fetch all categories
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*');
        
    if (catError) {
        console.error("Error fetching categories:", catError);
        return;
    }
    
    // Fetch all active products
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_uz, sku, category_id, is_deleted')
        .eq('is_deleted', false);
        
    if (prodError) {
        console.error("Error fetching products:", prodError);
        return;
    }
    
    const catMap = {};
    categories.forEach(c => {
        catMap[String(c.id)] = c;
    });
    
    // Group products by category_id (converting to string)
    const categoryProducts = {};
    products.forEach(p => {
        const cid = String(p.category_id);
        if (!categoryProducts[cid]) {
            categoryProducts[cid] = [];
        }
        categoryProducts[cid].push(p);
    });
    
    console.log(`\nTotal categories in database: ${categories.length}`);
    console.log(`Total active products in database: ${products.length}\n`);
    
    // Find active categories whose parent is deleted or missing
    const deadCats = [];
    categories.forEach(c => {
        if (c.is_deleted) return; // Ignore already deleted categories
        
        if (c.parent_id) {
            const parent = catMap[String(c.parent_id)];
            if (!parent) {
                deadCats.push({
                    category: c,
                    reason: `Parent ID '${c.parent_id}' does not exist.`
                });
            } else if (parent.is_deleted) {
                deadCats.push({
                    category: c,
                    reason: `Parent category '${parent.name_uz || parent.name}' (ID: ${parent.id}) is deleted.`
                });
            }
        }
    });
    
    console.log(`Found ${deadCats.length} active categories under deleted/missing parents:\n`);
    
    deadCats.forEach((item, idx) => {
        const c = item.category;
        const cid = String(c.id);
        const linkedProds = categoryProducts[cid] || [];
        
        console.log(`${idx + 1}. Kategoriya: "${c.name_uz || c.name}" (ID: ${c.id})`);
        console.log(`   Parent ID: ${c.parent_id} (${item.reason})`);
        console.log(`   Bog'langan aktiv mahsulotlar soni: ${linkedProds.length}`);
        
        if (linkedProds.length > 0) {
            console.log("   Mahsulotlar:");
            linkedProds.forEach(p => {
                console.log(`     - SKU: ${p.sku} | Nomi: ${p.name_uz || p.name} (ID: ${p.id})`);
            });
        }
        console.log("-".repeat(50));
    });
}

check();
