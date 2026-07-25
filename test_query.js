const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use the ANON key instead of the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testAnonQuery() {
    console.log("Fetching categories...");
    const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_deleted', false);
        
    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }
    
    console.log(`Categories count: ${categories.length}`);
    for (const c of categories) {
        if (c.image_meta !== null) {
            console.log(`Category ${c.name} has image_meta: type=${typeof c.image_meta}, value=${JSON.stringify(c.image_meta)}`);
        }
    }
}

testAnonQuery();
