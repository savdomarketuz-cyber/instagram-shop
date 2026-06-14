const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SALT = 'velari_fallback_shared_salt_2024';
const hash = pwd => crypto.createHash('sha256').update(pwd + SALT).digest('hex');

const affiliates = [
  { phone: '+998938830852', pwd: 'aisha',     name: 'Toirova',   code: 'AISHA30'     },
  { phone: '+998908285884', pwd: 'mbb',        name: 'MBB',       code: 'MBB30'       },
  { phone: '+998933989320', pwd: 'hosiyat',   name: 'Hosiyat',   code: 'HOSIYAT30'   },
  { phone: '+998991354096', pwd: 'nurbek',    name: 'Nurbek',    code: 'NURBEK30'    },
  { phone: '+998700486272', pwd: 'bloomyeen', name: 'Bloomyeen', code: 'BLOOMYEEN30' },
];

async function run() {
  const { data: tariff } = await supabase.from('promo_code_tariffs')
    .select('id, name').ilike('name', 'salom 30').single();
  if (!tariff) { console.error("Tariff SALOM 30 topilmadi!"); return; }
  console.log("Tariff:", tariff.name, tariff.id);

  for (const a of affiliates) {
    // 1. user — already exists check
    const { data: ex } = await supabase.from('users').select('id').eq('phone', a.phone).single();
    let uid;
    if (ex) {
      uid = ex.id;
      console.log(`${a.name}: user allaqachon bor (${uid})`);
    } else {
      uid = 'user_' + Math.random().toString(36).substr(2, 9);
      const { error: eu } = await supabase.from('users').insert({
        id: uid, phone: a.phone, username: a.phone, name: a.name, password: hash(a.pwd)
      });
      if (eu) { console.error(`${a.name} USER ERR:`, eu.message); continue; }
      console.log(`${a.name}: user yaratildi`);
    }

    // 2. promo code
    const { data: exCode } = await supabase.from('affiliate_promo_codes')
      .select('id').eq('code', a.code).single();
    if (exCode) { console.log(`${a.name}: kod allaqachon bor ${a.code}`); continue; }

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
    if (ec) console.error(`${a.name} CODE ERR:`, ec.message);
    else console.log(`${a.name}: kod yaratildi ${a.code}`);
  }
}
run();
