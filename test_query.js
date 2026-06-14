const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use the ANON key instead of the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testAnonQuery() {
    console.log("Running fetch products query with ANON KEY...");
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .gt('stock', 0);
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Total products returned with ANON KEY: ${products.length}`);
}

testAnonQuery();
