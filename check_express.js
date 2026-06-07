const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkExpress() {
    const { data: allProds } = await supabase.from('products').select('id, name, express_delivery');
    const { data: newProds } = await supabase.from('products')
        .select('id, name, express_delivery')
        .like('image', '%savdomarketimag/products/%');
        
    const allExpress = allProds.filter(p => p.express_delivery === true).length;
    const newExpress = newProds.filter(p => p.express_delivery === true).length;
    
    console.log(`Total products with express_delivery: ${allExpress}`);
    console.log(`New products with express_delivery: ${newExpress}`);
}
checkExpress();
