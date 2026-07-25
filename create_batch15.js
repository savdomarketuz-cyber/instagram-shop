const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SALT = process.env.ADMIN_SECRET || 'velari_fallback_shared_salt_2024';
const hash = pwd => crypto.createHash('sha256').update(pwd + SALT).digest('hex');

const affiliates = [
  { phone: '+998958979620', pwd: 'barno',   name: 'Barno',       code: 'BARNO30',      fallback: 'BARNO_B30'     },
  { phone: '+998917237323', pwd: 'mohim',   name: 'Mohim (M)',   code: 'MOHIM30',      fallback: 'MOHIM_M30'     },
  { phone: '+998998298580', pwd: 'zulfiya', name: 'Zulfiya S',   code: 'ZULFIYA_S30',  fallback: 'ZULFIYA_SUL30' }
];

async function run() {
  const { data: tariff } = await supabase.from('promo_code_tariffs')
    .select('id, name').ilike('name', 'salom 30').single();
  if (!tariff) { console.error("Tariff SALOM 30 topilmadi!"); return; }

  for (const a of affiliates) {
    console.log(`\n--- ${a.name} (${a.phone}) ---`);

    // Borligini tekshirish
    const { data: ex } = await supabase.from('users').select('*').eq('phone', a.phone).single();
    let uid;
    if (ex) {
      console.log(`  User allaqachon bor (${ex.id}), parol yangilanadi`);
      uid = ex.id;
      await supabase.from('users').update({ password: hash(a.pwd), name: a.name }).eq('id', uid);
    } else {
      uid = 'user_' + Math.random().toString(36).substr(2, 9);
      const { error: eu } = await supabase.from('users').insert({
        id: uid, phone: a.phone, username: a.phone, name: a.name,
        password: hash(a.pwd), is_admin: false,
        created_at: new Date().toISOString(), token_version: 1, real_balance: 0
      });
      if (eu) { console.error(`  USER ERR:`, eu.message); continue; }
      console.log(`  Yangi user yaratildi: ${uid}`);
    }

    // Promo kod yaratish
    let finalCode = a.code;
    const { data: exCode } = await supabase.from('affiliate_promo_codes')
      .select('id').eq('code', finalCode).single();
    
    if (exCode) {
      console.log(`  Kod band: ${finalCode}, fallback ko'rilmoqda...`);
      finalCode = a.fallback;
    }

    const { error: ec } = await supabase.from('affiliate_promo_codes').insert({
      affiliate_id: uid,
      tariff_id: tariff.id,
      code: finalCode,
      title: `${a.name} uchun promokod (Salom 30)`,
      is_active: true,
      usage_limit: 0,
      usage_count: 0,
      total_earned: 0
    });

    if (ec) console.error(`  CODE ERR:`, ec.message);
    else console.log(`  ✅ Kod yaratildi: ${finalCode}`);
  }
}

run();
