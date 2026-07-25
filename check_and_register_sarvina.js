const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SALT = process.env.ADMIN_SECRET || 'velari_fallback_shared_salt_2024';
const hash = pwd => crypto.createHash('sha256').update(pwd + SALT).digest('hex');

const affiliate = {
  phone: '+998970661073',
  pwd: 'sarvina',
  name: 'Miss sarvina',
  code: 'SARVINA30'
};

async function run() {
  // 1. Tarif topish
  const { data: tariff } = await supabase.from('promo_code_tariffs')
    .select('id, name').ilike('name', 'salom 30').single();
  if (!tariff) { console.error("Tariff SALOM 30 topilmadi!"); return; }

  // 2. User borligini tekshirish
  const { data: ex } = await supabase.from('users').select('*').eq('phone', affiliate.phone).single();
  let uid;
  if (ex) {
    console.log("USER ALLAQACHON RO'YXATDAN O'TGAN! Mana ma'lumotlar:");
    console.log(`ID: ${ex.id}`);
    console.log(`Telefon/Login: ${ex.phone}`);
    console.log(`Nomi: ${ex.name}`);
    
    // Promo kodini ham topamiz
    const { data: codes } = await supabase.from('affiliate_promo_codes')
      .select('code').eq('affiliate_id', ex.id);
    console.log("Promo kodlari:", codes.map(c => c.code).join(", "));
    return;
  }

  // 3. User yaratish (agar yo'q bo'lsa)
  uid = 'user_' + Math.random().toString(36).substr(2, 9);
  const { error: eu } = await supabase.from('users').insert({
    id: uid, phone: affiliate.phone, username: affiliate.phone, name: affiliate.name,
    password: hash(affiliate.pwd), is_admin: false,
    created_at: new Date().toISOString(), token_version: 1, real_balance: 0
  });
  if (eu) { console.error(`USER ERR:`, eu.message); return; }
  console.log(`Yangi user yaratildi: ${uid}`);

  // 4. Promo kod tekshirish va yaratish
  let finalCode = affiliate.code;
  const { data: exCode } = await supabase.from('affiliate_promo_codes')
    .select('id').eq('code', finalCode).single();
  
  if (exCode) {
    console.log(`Kod band: ${finalCode}, muqobil variant ko'rilmoqda...`);
    finalCode = 'SARVINA_E30'; // Esanova
    const { data: exCode2 } = await supabase.from('affiliate_promo_codes')
      .select('id').eq('code', finalCode).single();
    if (exCode2) {
      finalCode = 'SARVINA_M30';
    }
  }

  const { error: ec } = await supabase.from('affiliate_promo_codes').insert({
    affiliate_id: uid,
    tariff_id: tariff.id,
    code: finalCode,
    title: `${affiliate.name} uchun promokod (Salom 30)`,
    is_active: true,
    usage_limit: 0,
    usage_count: 0,
    total_earned: 0
  });

  if (ec) console.error(`CODE ERR:`, ec.message);
  else console.log(`✅ Kod yaratildi: ${finalCode}`);

  console.log("\n\n===== RO'YXATDAN O'TISH YAKUNLANMADI =====");
  console.log(`Login: ${affiliate.phone}`);
  console.log(`Parol: ${affiliate.pwd}`);
  console.log(`Promo-kod: ${finalCode}`);
}

run();
