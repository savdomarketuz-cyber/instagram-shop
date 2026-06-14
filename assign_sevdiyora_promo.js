const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const userId = "1d6b4f57-1d03-433c-b922-a7a05640558c";
    
    // Set the user's name to Sevdiyora since it was null
    await supabase.from('users').update({ name: "Sevdiyora" }).eq('id', userId);

    // Find Tariff 'SALOM 30'
    const { data: tariff } = await supabase.from('promo_code_tariffs').select('id, name').ilike('name', 'salom 30').single();
    if (!tariff) {
        console.error("Tariff 'SALOM 30' not found!");
        return;
    }
    console.log("Found tariff:", tariff.name, tariff.id);

    // Create Promo Code
    const promoCode = "SEVDIYORA";
    
    // Check if code exists
    const { data: existingPromo } = await supabase.from('affiliate_promo_codes').select('id').eq('code', promoCode).single();
    if (existingPromo) {
         console.log("Promo code", promoCode, "already exists!");
    } else {
         const { error: promoErr } = await supabase.from('affiliate_promo_codes').insert({
              affiliate_id: userId,
              tariff_id: tariff.id,
              code: promoCode,
              title: "Sevdiyora uchun promokod (Salom 30)",
              is_active: true,
              usage_limit: 0,
              usage_count: 0,
              total_earned: 0
         });
         if (promoErr) {
              console.error("Error creating promo code:", promoErr);
         } else {
              console.log("Promo code created successfully:", promoCode);
         }
    }
}

run();
