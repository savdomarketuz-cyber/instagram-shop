require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkDesc() {
    const { data } = await supabase.from('products').select('name, description, tag').ilike('name', '%vgr%').limit(1).single();
    console.log("VGR Product details:", JSON.stringify(data, null, 2));
}

checkDesc();
