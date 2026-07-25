const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkAllProducts() {
    console.log("Fetching all products...");
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .gt('stock', 0);
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Total products: ${products.length}`);
    
    let issues = [];
    
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        
        // Check images
        if (p.images !== null) {
            if (!Array.isArray(p.images)) {
                issues.push(`Product [${p.id}] "${p.name}": images is NOT an array, type=${typeof p.images}, value=${JSON.stringify(p.images)}`);
            } else {
                for (let j = 0; j < p.images.length; j++) {
                    if (typeof p.images[j] !== 'string') {
                        issues.push(`Product [${p.id}] "${p.name}": images[${j}] is NOT a string, type=${typeof p.images[j]}, value=${p.images[j]}`);
                    }
                }
            }
        }
        
        // Check price
        if (p.price === null || typeof p.price !== 'number') {
            issues.push(`Product [${p.id}] "${p.name}": price is not a number, type=${typeof p.price}, value=${p.price}`);
        }
        
        // Check stock
        if (p.stock === null || typeof p.stock !== 'number') {
            issues.push(`Product [${p.id}] "${p.name}": stock is not a number, type=${typeof p.stock}, value=${p.stock}`);
        }
        
        // Check stock_details
        if (p.stock_details !== null && typeof p.stock_details !== 'object') {
            issues.push(`Product [${p.id}] "${p.name}": stock_details is not an object, type=${typeof p.stock_details}`);
        }
        
        // Check image_metadata
        if (p.image_metadata !== null && typeof p.image_metadata !== 'object') {
            issues.push(`Product [${p.id}] "${p.name}": image_metadata is not an object, type=${typeof p.image_metadata}`);
        }
        
        // Check ai_persona
        if (p.ai_persona !== null && typeof p.ai_persona !== 'object') {
            issues.push(`Product [${p.id}] "${p.name}": ai_persona is not an object, type=${typeof p.ai_persona}`);
        }
    }
    
    console.log(`Inspection completed. Found ${issues.length} issues.`);
    if (issues.length > 0) {
        console.log("Issues details (first 10):");
        issues.slice(0, 10).forEach(iss => console.log(" - " + iss));
    }
}

checkAllProducts();
