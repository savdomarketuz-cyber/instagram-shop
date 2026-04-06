require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testEmbedding() {
    console.log("Checking if VGR product has an embedding...");
    
    const { data: product, error } = await supabase
        .from('products')
        .select('name, embedding')
        .ilike('name', '%vgr%')
        .limit(1)
        .single();
        
    if (error) {
        console.error("Error fetching product:", error);
        return;
    }

    console.log(`Product: ${product.name}`);
    console.log(`Has embedding? ${product.embedding ? 'YES (Length: ' + product.embedding.length + ')' : 'NO'}`);
}

testEmbedding();
