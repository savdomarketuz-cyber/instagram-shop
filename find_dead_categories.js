const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("=== Finding Orphaned / Dead Categories in Supabase ===\n");

    const { data: categories, error } = await supabase
        .from('categories')
        .select('*');

    if (error) {
        console.error("Error fetching categories:", error);
        return;
    }

    // Build a map of category ID to category details for easy lookup
    const catMap = {};
    categories.forEach(c => {
        catMap[c.id] = c;
    });

    const deadCategories = [];

    categories.forEach(c => {
        // We only care about active categories
        if (c.is_deleted) return;

        // If it has a parent
        if (c.parent_id) {
            const parent = catMap[c.parent_id];
            
            // Check if parent doesn't exist or is deleted
            if (!parent) {
                deadCategories.push({
                    category: c,
                    reason: `Parent ID '${c.parent_id}' does not exist in the categories table.`
                });
            } else if (parent.is_deleted) {
                deadCategories.push({
                    category: c,
                    reason: `Parent category '${parent.name_uz || parent.name}' (ID: ${c.parent_id}) is marked as deleted (is_deleted: true).`
                });
            }
        }
    });

    console.log(`Found ${deadCategories.length} active categories under deleted or missing parents:\n`);

    // Fetch product counts for these categories to see if they contain products
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_uz, sku, category_id')
        .eq('is_deleted', false);

    if (prodError) {
        console.error("Error fetching products:", prodError);
        return;
    }

    const categoryProductCounts = {};
    products.forEach(p => {
        if (!categoryProductCounts[p.category_id]) {
            categoryProductCounts[p.category_id] = [];
        }
        categoryProductCounts[p.category_id].push(p);
    });

    deadCategories.forEach((item, idx) => {
        const c = item.category;
        const linkedProducts = categoryProductCounts[c.id] || [];
        console.log(`${idx + 1}. Kategoriya: "${c.name_uz || c.name}" (ID: ${c.id})`);
        console.log(`   Ota Kategoriya ID: ${c.parent_id}`);
        console.log(`   Sabab: ${item.reason}`);
        console.log(`   Bog'langan aktiv mahsulotlar soni: ${linkedProducts.length}`);
        if (linkedProducts.length > 0) {
            console.log("   Mahsulotlar:");
            linkedProducts.forEach(p => {
                console.log(`     - SKU: ${p.sku} | Nomi: ${p.name_uz || p.name}`);
            });
        }
        console.log("");
    });
}

check();
