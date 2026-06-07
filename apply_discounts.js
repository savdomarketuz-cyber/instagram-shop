const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function discountProducts() {
    console.log("Fetching new products...");
    const { data: products, error: fetchErr } = await supabase.from('products')
        .select('id, name, price, old_price')
        .like('image', '%savdomarketimag/products/%');
        
    if (fetchErr) return console.error('Error fetching products:', fetchErr);
    
    console.log(`Found ${products.length} products to discount.`);
    
    let updatedCount = 0;
    
    for (const p of products) {
        // Assume current price is the base price.
        // If old_price is already set, we might use it as base to prevent double discounting, 
        // but here we just take the current price if old_price isn't set, 
        // or old_price if it is already discounted. Let's use old_price if exists, else price.
        const basePrice = p.old_price && p.old_price > p.price ? p.old_price : p.price;
        
        let discountPercent = 0;
        if (basePrice <= 200000) {
            discountPercent = 10;
        } else if (basePrice <= 500000) {
            discountPercent = 7;
        } else {
            discountPercent = 5;
        }
        
        const newPrice = Math.round(basePrice * (1 - discountPercent / 100));
        
        // Ensure new price makes sense
        if (newPrice < basePrice) {
            const { error: upErr } = await supabase.from('products')
                .update({ 
                    price: newPrice,
                    old_price: basePrice
                })
                .eq('id', p.id);
                
            if (upErr) {
                console.error(`Error updating product ${p.id}:`, upErr);
            } else {
                updatedCount++;
            }
        }
    }
    
    console.log(`Successfully discounted ${updatedCount} products.`);
}

discountProducts();
