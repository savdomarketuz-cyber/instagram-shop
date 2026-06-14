const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*');
        
    if (catError) {
        console.error(catError);
        return;
    }
    
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_uz, sku, category_id, is_deleted')
        .eq('is_deleted', false);
        
    if (prodError) {
        console.error(prodError);
        return;
    }
    
    const catMap = {};
    categories.forEach(c => {
        catMap[String(c.id)] = c;
    });
    
    const categoryProducts = {};
    products.forEach(p => {
        const cid = String(p.category_id);
        if (!categoryProducts[cid]) {
            categoryProducts[cid] = [];
        }
        categoryProducts[cid].push(p);
    });
    
    const deadCats = [];
    categories.forEach(c => {
        if (c.is_deleted) return;
        
        if (c.parent_id) {
            const parent = catMap[String(c.parent_id)];
            if (!parent || parent.is_deleted) {
                deadCats.push({
                    id: String(c.id),
                    name: c.name_uz || c.name,
                    parent_id: String(c.parent_id),
                    parent_name: parent ? (parent.name_uz || parent.name) : 'Unknown',
                    products: categoryProducts[String(c.id)] || []
                });
            }
        }
    });
    
    console.log(JSON.stringify(deadCats, null, 2));
}

run();
