const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Using service role key for database write operations
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const duplicateCategoryIds = [
    '178098588870640',
    '1780985895524626',
    '1780984510590640',
    '1780985901697366',
    '1780984737633230',
    '1780985892230433'
];

async function run() {
    console.log("=== Duplicate Blender Categories Soft-Deletion ===");
    console.log(`Target Category IDs: ${duplicateCategoryIds.join(', ')}`);
    
    const { data, error } = await supabase
        .from('categories')
        .update({ is_deleted: true })
        .in('id', duplicateCategoryIds)
        .select();

    if (error) {
        console.error("Error updating categories:", error.message);
    } else {
        console.log(`Successfully marked ${data.length} categories as deleted.`);
        data.forEach(c => {
            console.log(`- ID: ${c.id} | Name: ${c.name_uz || c.name} (is_deleted: ${c.is_deleted})`);
        });
    }
}

run().catch(console.error);
