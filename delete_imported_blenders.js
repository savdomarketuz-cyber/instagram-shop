const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ORIGINAL_IDS = [
    'a090ed75-1753-469e-a8b4-3f295a1baa09',
    'd16bfe46-c939-462a-8cc6-f83303883bfc',
    '45e11ad2-d8fd-4213-bcea-940f3cd35d37',
    '933e259e-9663-4adf-9592-6de9ea358d06',
    'fe0da69b-19cb-4a87-8cae-3088ad80df68',
    '9ff1969e-58d8-460a-bd59-3139d87a9fa2',
    'a5f3a8eb-8b29-4338-9a53-10b521057fca',
    '6b21222f-c070-4fc5-a37d-294298446cbe',
    '31a3d48d-2d98-4b97-9913-8520538e2025',
    '0e073a2c-44ed-4ced-bd73-36ebe97dab9c',
    'a8334f0e-8234-4a01-8006-2f0ec73c9224',
    '1eb721a0-dd23-4d05-beec-6e65b25fe9c0',
    'f6f9f7fc-5be8-43f2-b2e7-60a603bb8104',
    '1a47bd1b-c87a-4cd6-b5a7-b1c0d52a594a',
    '335f43cb-7c40-40c6-8f9e-f5eafe33cd24',
    '49516b10-14e1-4d01-9373-023448d0cff6',
    'ad418ab1-068f-4cf6-9892-2fba87c932c5'
];

async function run() {
    console.log("Starting cleanup of extra imported products...");
    
    // Find all products in categories 501 and 17809901663251 that are not in the ORIGINAL_IDS list
    const { data: extraProds, error: fetchErr } = await supabase
        .from('products')
        .select('id, sku, name')
        .in('category_id', ['501', '17809901663251'])
        .not('id', 'in', `(${ORIGINAL_IDS.join(',')})`);
        
    if (fetchErr) {
        console.error("Error fetching extra products:", fetchErr);
        return;
    }
    
    console.log(`Found ${extraProds.length} extra products to delete.`);
    if (extraProds.length === 0) {
        console.log("No extra products found. Database is clean.");
        return;
    }
    
    const extraIds = extraProds.map(p => p.id);
    
    // 1. Delete parameter values for these products
    console.log("Deleting parameter values...");
    const { error: paramDelErr } = await supabase
        .from('product_param_values')
        .delete()
        .in('product_id', extraIds);
        
    if (paramDelErr) {
        console.error("Error deleting parameter values:", paramDelErr.message);
    } else {
        console.log("Deleted parameter values successfully.");
    }
    
    // 2. Delete products
    console.log("Deleting products...");
    const { error: prodDelErr } = await supabase
        .from('products')
        .delete()
        .in('id', extraIds);
        
    if (prodDelErr) {
        console.error("Error deleting products:", prodDelErr.message);
    } else {
        console.log("Deleted products successfully.");
    }
    
    console.log("Database cleanup complete!");
}

run().catch(console.error);
