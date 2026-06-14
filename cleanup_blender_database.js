const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Using service role key for database write operations
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MODE = process.argv[2] === 'execute' ? 'execute' : 'dry-run';

async function run() {
    console.log(`=== Blender Database Cleanup Script (${MODE.toUpperCase()} Mode) ===\n`);

    // Target active categories
    const ACTIVE_TABLE_BLENDER_CAT = '501';      // "Blenderlar" under "Maishiy texnika"
    const ACTIVE_HAND_BLENDER_CAT = '17809901663251'; // "Qo'l blenderlari" under "Maishiy texnika"

    // 1. Define updates for products
    const productUpdates = [
        {
            id: 'd16bfe46-c939-462a-8cc6-f83303883bfc',
            sku: 'BLENDER BOSCH',
            name: 'Blender va Kofe maydalagich "BOSCH"',
            update: { category_id: ACTIVE_TABLE_BLENDER_CAT }
        },
        {
            id: '933e259e-9663-4adf-9592-6de9ea358d06',
            sku: 'BLENDER SAMSUNG',
            name: 'Blender va Kofe maydalagich "Samsung"',
            update: { category_id: ACTIVE_TABLE_BLENDER_CAT }
        },
        {
            id: '9ff1969e-58d8-460a-bd59-3139d87a9fa2',
            sku: 'BLENDER LG SVET',
            name: 'Blender va Kofe maydalagich "LG"',
            update: { category_id: ACTIVE_TABLE_BLENDER_CAT }
        },
        {
            id: 'a5f3a8eb-8b29-4338-9a53-10b521057fca',
            sku: 'SONIFER SF-8006',
            name: 'Stol usti blenderi Sonifer 2в1',
            update: { category_id: ACTIVE_TABLE_BLENDER_CAT }
        },
        // For Sonifer SF-8142, we keep one copy and move it to Hand Blenders
        {
            id: 'd430d717-dc44-4633-8edb-475f92e48b49',
            sku: 'SONIFER SF-8142',
            name: 'Blender Sonifer SF-8142 (Copy 1)',
            update: { category_id: ACTIVE_HAND_BLENDER_CAT }
        },
        // We mark the duplicate copy as deleted to prevent double listing
        {
            id: 'adfc20c8-2a25-432c-bbb6-413d14fcb309',
            sku: 'SONIFER SF-8142',
            name: 'Blender Sonifer SF-8142 (Copy 2 - Duplicate)',
            update: { is_deleted: true }
        }
    ];

    // 2. Define duplicate categories to delete
    const duplicateCategoryIds = [
        '178098588870640',
        '1780985895524626',
        '1780984510590640',
        '1780985901697366',
        '1780984737633230',
        '1780985892230433'
    ];

    console.log("--- Scheduled Product Updates ---");
    productUpdates.forEach(p => {
        console.log(`Product: ${p.name} (SKU: ${p.sku})`);
        console.log(`  Action: Update fields: ${JSON.stringify(p.update)}`);
    });

    console.log("\n--- Scheduled Category Deletions (Mark as deleted) ---");
    console.log(`Categories to mark as is_deleted = true: ${duplicateCategoryIds.join(', ')}`);

    if (MODE === 'dry-run') {
        console.log("\n[DRY RUN] No changes were made to the database. To execute, run: node cleanup_blender_database.js execute");
        return;
    }

    console.log("\nExecuting updates in database...");

    // Apply product updates
    for (const p of productUpdates) {
        console.log(`Updating product ${p.sku}...`);
        const { error } = await supabase
            .from('products')
            .update(p.update)
            .eq('id', p.id);
        if (error) {
            console.error(`  Error updating product ${p.sku}:`, error.message);
        } else {
            console.log(`  Successfully updated product ${p.sku}`);
        }
    }

    // Apply category soft deletes
    console.log("\nUpdating categories...");
    const { error: catError } = await supabase
        .from('categories')
        .update({ is_deleted: true })
        .in('id', duplicateCategoryIds);

    if (catError) {
        console.error("  Error deleting duplicate categories:", catError.message);
    } else {
        console.log("  Successfully marked duplicate categories as deleted.");
    }

    console.log("\nDatabase cleanup execution completed!");
}

run().catch(console.error);
