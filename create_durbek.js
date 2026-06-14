const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function hashPassword(password) {
    const salt = process.env.ADMIN_SECRET || "velari_fallback_shared_salt_2024";
    return crypto.createHash("sha256").update(password + salt).digest("hex");
}

async function run() {
    const name = "Durbek"; 
    const phone = "+998942192272";
    const passwordPlain = "durbek"; 
    const passwordHash = hashPassword(passwordPlain);
    let userId;
    
    // 1. Create or Update user
    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', phone).single();
    if (existingUser) {
        userId = existingUser.id;
        console.log("User already exists! ID:", userId);
        await supabase.from('users').update({
           password: passwordHash,
           name: name
        }).eq('id', userId);
    } else {
        userId = "user_" + Math.random().toString(36).substr(2, 9);
        const { error } = await supabase.from('users').insert({
            id: userId,
            phone: phone,
            username: phone,
            name: name,
            password: passwordHash,
            is_admin: false,
            created_at: new Date().toISOString(),
            token_version: 1,
            real_balance: 0
        });
        if (error) {
            console.error("Error creating user:", error);
            return;
        }
        console.log("User created successfully:", userId);
    }

    // 2. Find Tariff 'SALOM 30'
    const { data: tariff } = await supabase.from('promo_code_tariffs').select('id, name').ilike('name', 'salom 30').single();
    if (!tariff) {
        console.error("Tariff 'SALOM 30' not found!");
        return;
    }
    console.log("Found tariff:", tariff.name, tariff.id);

    // 3. Create Promo Code
    const promoCode = "DURBEK30";
    
    // Check if code exists
    const { data: existingPromo } = await supabase.from('affiliate_promo_codes').select('id').eq('code', promoCode).single();
    if (existingPromo) {
         console.log("Promo code", promoCode, "already exists!");
    } else {
         const { error: promoErr } = await supabase.from('affiliate_promo_codes').insert({
              affiliate_id: userId,
              tariff_id: tariff.id,
              code: promoCode,
              title: "Durbek uchun promokod (Salom 30)",
              is_active: true,
              usage_limit: 0,
              usage_count: 0,
              total_earned: 0
         });
         if (promoErr) {
              console.error("Error creating promo code:", promoErr);
         } else {
              console.log("Promo code created:", promoCode);
         }
    }
}

run();
