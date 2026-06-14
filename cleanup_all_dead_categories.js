const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MODE = process.argv[2] === 'execute' ? 'execute' : 'dry-run';

async function run() {
    console.log(`=== Database Dead Categories Cleanup (${MODE.toUpperCase()} Mode) ===\n`);

    // Target parent categories
    const ACTIVE_MAISHIY_TEXNIKA = '5';
    const ACTIVE_ELEKTRONIKA = '3';

    // Target active categories for merges
    const ACTIVE_CHANGYUTGICHLAR = '514';
    const ACTIVE_MIKSERLAR = '511';

    // 1. Categories to re-parent (no product movement needed)
    const reparentPlans = [
        { id: '1780986636702826', name: "Kapuchinatorlar (Sut ko'pirtirgichlar)", newParent: ACTIVE_MAISHIY_TEXNIKA },
        { id: '1780984736567828', name: "Tarozilar", newParent: ACTIVE_MAISHIY_TEXNIKA },
        { id: '1780985890492647', name: "Kombayn va maydalagichlar", newParent: ACTIVE_MAISHIY_TEXNIKA },
        { id: '1780986639339682', name: "Aerogrillar", newParent: ACTIVE_MAISHIY_TEXNIKA },
        { id: '1780984515439411', name: "Quymaq pishirgichlar", newParent: ACTIVE_MAISHIY_TEXNIKA },
        { id: '1780990168256771', name: "Portativ kalonkalar", newParent: ACTIVE_ELEKTRONIKA }
    ];

    // 2. Categories to merge (products move, dead categories get soft-deleted)
    const mergePlans = [
        {
            deadId: '1780984509006998',
            deadName: "Changyutgichlar (Orphaned)",
            targetId: ACTIVE_CHANGYUTGICHLAR,
            targetName: "Changyutgichlar (Active)"
        },
        {
            deadId: '1780984732681585',
            deadName: "Mikserlar (Orphaned Copy 1)",
            targetId: ACTIVE_MIKSERLAR,
            targetName: "Mikserlar (Active)"
        },
        {
            deadId: '1780986763534967',
            deadName: "Mikserlar (Orphaned Copy 2)",
            targetId: ACTIVE_MIKSERLAR,
            targetName: "Mikserlar (Active)"
        }
    ];

    console.log("--- Phase 1: Re-parenting Categories ---");
    reparentPlans.forEach(plan => {
        console.log(`Category: "${plan.name}" (ID: ${plan.id}) -> New Parent: ${plan.newParent}`);
    });

    console.log("\n--- Phase 2: Merging Duplicate Categories & Products ---");
    for (const plan of mergePlans) {
        // Find products in the dead category
        const { data: prods, error } = await supabase
            .from('products')
            .select('id, name, name_uz, sku')
            .eq('category_id', plan.deadId)
            .eq('is_deleted', false);

        if (error) {
            console.error(`Error fetching products for dead category ${plan.deadId}:`, error);
            return;
        }

        console.log(`Category: "${plan.deadName}" (ID: ${plan.deadId}) -> Target: "${plan.targetName}" (ID: ${plan.targetId})`);
        console.log(`  Products to move (${prods.length}):`);
        prods.forEach(p => {
            console.log(`    - SKU: ${p.sku} | ${p.name_uz || p.name} (ID: ${p.id})`);
        });
        plan.products = prods;
    }

    if (MODE === 'dry-run') {
        console.log("\n[DRY RUN] No changes were made to the database. To execute, run: node cleanup_all_dead_categories.js execute");
        return;
    }

    console.log("\n--- EXECUTING CHANGES IN DATABASE ---");

    // Execute Phase 1: Re-parenting
    for (const plan of reparentPlans) {
        console.log(`Re-parenting "${plan.name}" (ID: ${plan.id}) to parent ${plan.newParent}...`);
        const { error } = await supabase
            .from('categories')
            .update({ parent_id: plan.newParent })
            .eq('id', plan.id);

        if (error) {
            console.error(`  Error:`, error.message);
        } else {
            console.log(`  Successfully re-parented.`);
        }
    }

    // Execute Phase 2: Merging products & soft-deleting categories
    for (const plan of mergePlans) {
        if (plan.products.length > 0) {
            console.log(`Moving ${plan.products.length} products from category ${plan.deadId} to ${plan.targetId}...`);
            const productIds = plan.products.map(p => p.id);
            
            const { error } = await supabase
                .from('products')
                .update({ category_id: plan.targetId })
                .in('id', productIds);

            if (error) {
                console.error(`  Error moving products:`, error.message);
                continue;
            } else {
                console.log(`  Successfully moved products.`);
            }
        } else {
            console.log(`No products to move from category ${plan.deadId}.`);
        }

        console.log(`Soft-deleting dead category "${plan.deadName}" (ID: ${plan.deadId})...`);
        const { error: catError } = await supabase
            .from('categories')
            .update({ is_deleted: true })
            .eq('id', plan.deadId);

        if (catError) {
            console.error(`  Error soft-deleting category:`, catError.message);
        } else {
            console.log(`  Successfully soft-deleted category.`);
        }
    }

    console.log("\nDatabase cleanup execution completed successfully!");
}

run().catch(console.error);
