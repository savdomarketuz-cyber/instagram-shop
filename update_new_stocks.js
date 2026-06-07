const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateStocks() {
    // 1. Get warehouse ID
    const { data: warehouse, error: wErr } = await supabase.from('warehouses')
        .select('id, name')
        .ilike('name', '%VELARI FASHION%')
        .single();
        
    if (wErr || !warehouse) {
        return console.error('Error finding warehouse "VELARI FASHION":', wErr);
    }
    
    console.log(`Found warehouse: ${warehouse.name} (ID: ${warehouse.id})`);
    
    // 2. Fetch new products
    const { data: products, error: pErr } = await supabase.from('products')
        .select('id, stock, stock_details')
        .like('image', '%savdomarketimag/products/%');
        
    if (pErr) {
        return console.error('Error fetching products:', pErr);
    }
    
    console.log(`Found ${products.length} new products to update.`);
    
    let updatedCount = 0;
    
    // 3. Update stock
    for (const p of products) {
        const currentDetails = p.stock_details || {};
        const newDetails = { ...currentDetails, [warehouse.id]: 10 };
        
        // Calculate total stock
        let totalStock = 0;
        for (const qty of Object.values(newDetails)) {
            totalStock += (Number(qty) || 0);
        }
        
        const { error: upErr } = await supabase.from('products')
            .update({ 
                stock_details: newDetails,
                stock: totalStock
            })
            .eq('id', p.id);
            
        if (upErr) {
            console.error(`Failed to update stock for ${p.id}:`, upErr);
        } else {
            updatedCount++;
        }
    }
    
    console.log(`Successfully updated stock for ${updatedCount} products.`);
}

updateStocks();
