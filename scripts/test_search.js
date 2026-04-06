require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    console.log("Testing search for 'vgr'");
    
    // Test the RPC specifically
    const { data: results, error } = await supabase.rpc('advanced_smart_search', {
        search_query: "vgr",
        query_embedding: null,
        match_threshold: 0.25,
        match_count: 50
    });
    
    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log(`RPC returned ${results ? results.length : 0} results`);
    }

    // Let's also check if the product actually exists
    const { data: productCheck, error: pError } = await supabase.from('products').select('name').ilike('name', '%vgr%');
    console.log(`Direct ILIKE check returned ${productCheck ? productCheck.length : 0} results`, productCheck);
}

test();
