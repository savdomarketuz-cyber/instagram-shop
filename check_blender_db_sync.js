const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const stationaryFile = 'D:/Desktop/uzum yangi mahsulotlar/categories/blenders_stationary.json';
const handFile = 'D:/Desktop/uzum yangi mahsulotlar/categories/blenders_hand.json';

async function run() {
    const stationary = JSON.parse(fs.readFileSync(stationaryFile, 'utf-8'));
    const hand = JSON.parse(fs.readFileSync(handFile, 'utf-8'));
    
    const localSkus = new Set();
    const localProducts = [];
    
    // Process stationary
    for (const [id, prod] of Object.entries(stationary)) {
        if (prod.prices && prod.prices.length > 0) {
            localProducts.push({ id, ...prod, type: 'stationary' });
            localSkus.add(prod.model.toUpperCase());
        }
    }
    
    // Process hand
    for (const [id, prod] of Object.entries(hand)) {
        if (prod.prices && prod.prices.length > 0) {
            localProducts.push({ id, ...prod, type: 'hand' });
            localSkus.add(prod.model.toUpperCase());
        }
    }
    
    console.log(`Local products in JSON: ${localProducts.length}`);
    console.log(`Local unique model/SKUs: ${localSkus.size}`);
    
    // Fetch products in DB
    const { data: dbProducts, error } = await supabase
        .from('products')
        .select('id, name, sku, is_deleted, category_id')
        .eq('is_deleted', false);
        
    if (error) {
        console.error("DB error:", error);
        return;
    }
    
    console.log(`Active products in DB: ${dbProducts.length}`);
    
    const matched = [];
    const unmatched = [];
    
    for (const lp of localProducts) {
        // Let's match by SKU or model (since Uzum scraped IDs are in LP)
        // Wait, usually the DB SKU field contains something like "SONIFER SF-8070" or model number
        // Let's see if we can find any matching product in DB
        const match = dbProducts.find(dp => {
            const dpSku = String(dp.sku).toUpperCase();
            const lpModel = String(lp.model).toUpperCase();
            return dpSku.includes(lpModel) || lpModel.includes(dpSku);
        });
        
        if (match) {
            matched.push({ lp, match });
        } else {
            unmatched.push(lp);
        }
    }
    
    console.log(`Matched: ${matched.length}`);
    console.log(`Unmatched (not in DB): ${unmatched.length}`);
    
    if (unmatched.length > 0) {
        console.log("\nSome unmatched local products:");
        unmatched.slice(0, 10).forEach(u => {
            console.log(`- ID: ${u.id} | Brand: ${u.brand} | Model: ${u.model} | Prices:`, u.prices);
        });
    }
}

run();
