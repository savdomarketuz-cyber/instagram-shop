const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, name_uz, parent_id, is_deleted')
        .eq('is_deleted', false);

    if (error) {
        console.error(error);
        return;
    }

    console.log("=== Active Categories in Database ===");
    categories.forEach(c => {
        console.log(`ID: ${c.id} | Name: ${c.name_uz || c.name} | Parent ID: ${c.parent_id}`);
    });
}

run();
