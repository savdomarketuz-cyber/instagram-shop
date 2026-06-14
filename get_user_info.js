const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const phone = "+998996458238";
    
    // Get user info
    const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();
        
    if (userErr) {
        console.log("Foydalanuvchi topilmadi yoki xato:", userErr.message);
        return;
    }
    
    console.log("=== Foydalanuvchi ma'lumotlari ===");
    console.log(JSON.stringify(user, null, 2));
    
    // Get affiliate promo codes if any
    const { data: promos, error: promoErr } = await supabase
        .from('affiliate_promo_codes')
        .select('*')
        .eq('affiliate_id', user.id);
        
    if (promos && promos.length > 0) {
        console.log("\n=== Promokodlari ===");
        console.log(JSON.stringify(promos, null, 2));
    } else {
         console.log("\nUshbu foydalanuvchida promokodlar yo'q (hamkor emas).");
    }
}

run();
