const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const outputDir = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories';

const targetSkus = [
    // 8 Choppers
    'ORVICA-ORM-2025',
    'ORVICA-ORM-2023',
    'ORVICA-ORM-2015',
    'ORVICA-ORM-7912',
    'ORVICA-ORM-2012',
    'ORVICA-ORM-2006-3',
    'ORVICA-ORM-7913',
    'ORVICA-ORM-7913-3',
    // 2 Blenders
    'UAKEEN-ZL-2402-QORA',
    'ORVICA-ORM-3622'
];

async function run() {
    console.log("=== Exporting and Soft-Deleting 10 Unmatched Products ===\n");
    
    // 1. Fetch full records from Supabase
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .in('sku', targetSkus)
        .eq('is_deleted', false);
        
    if (error) {
        console.error("Error fetching products:", error);
        return;
    }
    
    console.log(`Fetched ${products.length} active products from database.`);
    
    // Group them: 8 choppers and 2 blenders
    const choppers = [];
    const blenders = [];
    
    products.forEach(p => {
        const skuUpper = p.sku.toUpperCase();
        if (skuUpper.includes('CHOPPER') || skuUpper.includes('MAYDALAGICH') || skuUpper.includes('ORM-2025') || skuUpper.includes('ORM-2023') || skuUpper.includes('ORM-2015') || skuUpper.includes('ORM-7912') || skuUpper.includes('ORM-2012') || skuUpper.includes('ORM-2006-3') || skuUpper.includes('ORM-7913')) {
            choppers.push(p);
        } else {
            blenders.push(p);
        }
    });
    
    console.log(`- Choppers group size: ${choppers.length}`);
    console.log(`- Blenders group size: ${blenders.length}`);
    
    // 2. Save to JSON files
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const choppersPath = path.join(outputDir, '8_choppers.json');
    const blendersPath = path.join(outputDir, '2_blenders.json');
    
    fs.writeFileSync(choppersPath, JSON.stringify(choppers, null, 2), 'utf8');
    fs.writeFileSync(blendersPath, JSON.stringify(blenders, null, 2), 'utf8');
    
    console.log(`\nSaved backups:`);
    console.log(`- ${choppersPath}`);
    console.log(`- ${blendersPath}`);
    
    // 3. Soft-delete in database
    console.log(`\nUpdating database records (setting is_deleted = true)...`);
    const productIds = products.map(p => p.id);
    
    if (productIds.length > 0) {
        const { data: updated, error: updateErr } = await supabase
            .from('products')
            .update({ is_deleted: true })
            .in('id', productIds)
            .select('id, sku, name');
            
        if (updateErr) {
            console.error("Error updating products:", updateErr.message);
        } else {
            console.log(`Successfully soft-deleted ${updated.length} products in database:`);
            updated.forEach(p => {
                console.log(`  - SKU: ${p.sku} | Name: ${p.name}`);
            });
        }
    } else {
        console.log("No active products to update.");
    }
    
    console.log("\nProcess completed successfully!");
}

run().catch(console.error);
