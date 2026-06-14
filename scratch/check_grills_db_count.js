const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'D:/Desktop/asosiy dasturlar/instagram shop/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const GRILLS_CAT_ID = '1780986639339682'; // "Aerogrillar"

async function main() {
    console.log("=== VERIFYING GRILLS IN DATABASE ===");
    
    // Count products in category
    const { data, count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: false })
        .eq('category_id', GRILLS_CAT_ID);
        
    if (error) {
        console.error("Error fetching products count:", error.message);
        return;
    }
    
    console.log(`Jami bazaga yuklangan grillar soni: ${data.length}`);
    
    // Check if any product has stock > 0
    const nonZeroStock = data.filter(p => p.stock > 0);
    console.log(`Stock-i 0 dan farqli bo'lgan mahsulotlar soni: ${nonZeroStock.length}`);
    
    // Print first 5 items to check
    console.log("\nFirst 5 imported items:");
    data.slice(0, 5).forEach((p, idx) => {
        console.log(`  ${idx+1}. SKU: ${p.sku} | Name: ${p.name_uz} | Price: ${p.price} UZS | Stock: ${p.stock}`);
    });
}

main().catch(console.error);
