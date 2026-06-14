const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SALT = process.env.ADMIN_SECRET || 'velari_fallback_shared_salt_2024';
const hash = pwd => crypto.createHash('sha256').update(pwd + SALT).digest('hex');

// 3 ta tayyor kreator: telefon bergan va shartga rozi bo'lgan
const affiliates = [
  { phone: '+998946716760', pwd: 'ilchik',     name: 'Ilchik',     code: 'ILCHIK30'    },
  { phone: '+998905506511', pwd: 'alixan',     name: 'Alixan',     code: 'ALIXAN30'    },
  { phone: '+998998761298', pwd: 'jamshid',    name: 'Jamshid',    code: 'JAMSHID30'   },
];

async function run() {
  // 1. Tarif topish
  const { data: tariff } = await supabase.from('promo_code_tariffs')
    .select('id, name').ilike('name', 'salom 30').single();
  if (!tariff) { console.error("Tariff SALOM 30 topilmadi!"); return; }
  console.log("Tariff:", tariff.name, tariff.id);
  console.log("=" .repeat(50));

  for (const a of affiliates) {
    console.log(`\n--- ${a.name} (${a.phone}) ---`);

    // 2. User yaratish yoki topish
    const { data: ex } = await supabase.from('users').select('id').eq('phone', a.phone).single();
    let uid;
    if (ex) {
      uid = ex.id;
      console.log(`  User allaqachon bor (${uid}), parol yangilanadi`);
      await supabase.from('users').update({ password: hash(a.pwd), name: a.name }).eq('id', uid);
    } else {
      uid = 'user_' + Math.random().toString(36).substr(2, 9);
      const { error: eu } = await supabase.from('users').insert({
        id: uid, phone: a.phone, username: a.phone, name: a.name,
        password: hash(a.pwd), is_admin: false,
        created_at: new Date().toISOString(), token_version: 1, real_balance: 0
      });
      if (eu) { console.error(`  USER ERR:`, eu.message); continue; }
      console.log(`  User yaratildi: ${uid}`);
    }

    // 3. Promo kod yaratish
    const { data: exCode } = await supabase.from('affiliate_promo_codes')
      .select('id').eq('code', a.code).single();
    if (exCode) {
      console.log(`  Kod allaqachon bor: ${a.code}`);
      continue;
    }

    const { error: ec } = await supabase.from('affiliate_promo_codes').insert({
      affiliate_id: uid,
      tariff_id: tariff.id,
      code: a.code,
      title: `${a.name} uchun promokod (Salom 30)`,
      is_active: true,
      usage_limit: 0,
      usage_count: 0,
      total_earned: 0
    });
    if (ec) console.error(`  CODE ERR:`, ec.message);
    else console.log(`  ✅ Kod yaratildi: ${a.code}`);
  }

  console.log("\n\n===== YAKUN =====");
  console.log("Endi UGC chatlariga quyidagi xabarlarni yuborish kerak:\n");
  for (const a of affiliates) {
    console.log(`📨 ${a.name}:`);
    console.log(`  Login: ${a.phone}`);
    console.log(`  Parol: ${a.pwd}`);
    console.log(`  Promo-kod: ${a.code}\n`);
  }
}

run();
