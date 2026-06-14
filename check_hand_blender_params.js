const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Check hand blender category (17809901663251)
    const { data: catParams, error } = await supabase
        .from('category_params')
        .select('*')
        .eq('category_id', '17809901663251');
        
    if (error) {
        console.error(error);
        return;
    }
    
    console.log(`=== Hand Blender Category Parameters (ID: 17809901663251) ===`);
    console.log(`Found ${catParams.length} parameters.`);
    catParams.forEach((cp, idx) => {
        console.log(`${idx + 1}. Name: ${cp.name_uz} (ID: ${cp.id})`);
    });
}

run();
