const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function hashPassword(password) {
    const salt = process.env.ADMIN_SECRET || "velari_fallback_shared_salt_2024";
    return crypto.createHash("sha256").update(password + salt).digest("hex");
}

const PARTNERS = [
    { name: "Maftuna",     phone: "+998773857970", pass: "maftuna",     code: "MAFTUNA30" },
    { name: "Gulmira",     phone: "+998771691500", pass: "gulmira",     code: "GULMIRA30" },
    { name: "Ahror",       phone: "+998940940153", pass: "ahror",       code: "AHROR30" },
    { name: "Otash",       phone: "+998920232900", pass: "otash",       code: "OTASH30" },
    { name: "Feruzabonu",  phone: "+998907680122", pass: "feruzabonu",  code: "FERUZABONU30" },
    { name: "Shahzoda",    phone: "+998918530107", pass: "shahzoda",    code: "SHAHZODA30" },
    { name: "Mukhsinov",   phone: "+998932322345", pass: "mukhsinov",   code: "MUKHSINOV30" },
    { name: "Berdiyarova", phone: "+998902407006", pass: "berdiyarova", code: "BERDIYAROVA30" },
    { name: "Ruxshona I",  phone: "+998777210315", pass: "ruxshonai",   code: "RUXSHONAI30" },
    { name: "Komiljon",    phone: "+998882428500", pass: "komiljon",    code: "KOMILJON30" },
];

async function createOne(p) {
    const passwordHash = hashPassword(p.pass);
    let userId;

    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', p.phone).single();
    if (existingUser) {
        userId = existingUser.id;
        await supabase.from('users').update({ password: passwordHash, name: p.name }).eq('id', userId);
        console.log(`[${p.name}] user mavjud: ${userId}`);
    } else {
        userId = "user_" + Math.random().toString(36).substr(2, 9);
        const { error } = await supabase.from('users').insert({
            id: userId, phone: p.phone, username: p.phone, name: p.name,
            password: passwordHash, is_admin: false,
            created_at: new Date().toISOString(), token_version: 1, real_balance: 0
        });
        if (error) { console.error(`[${p.name}] user xato:`, error.message); return; }
        console.log(`[${p.name}] user yaratildi: ${userId}`);
    }

    const { data: tariff } = await supabase.from('promo_code_tariffs').select('id').ilike('name', 'salom 30').single();
    if (!tariff) { console.error("Tariff 'SALOM 30' topilmadi!"); return; }

    const { data: existingPromo } = await supabase.from('affiliate_promo_codes').select('id').eq('code', p.code).single();
    if (existingPromo) {
        console.log(`[${p.name}] promokod ${p.code} mavjud`);
    } else {
        const { error: promoErr } = await supabase.from('affiliate_promo_codes').insert({
            affiliate_id: userId, tariff_id: tariff.id, code: p.code,
            title: `${p.name} uchun promokod (Salom 30)`,
            is_active: true, usage_limit: 0, usage_count: 0, total_earned: 0
        });
        if (promoErr) { console.error(`[${p.name}] promokod xato:`, promoErr.message); }
        else { console.log(`[${p.name}] promokod yaratildi: ${p.code}`); }
    }
}

async function run() {
    for (const p of PARTNERS) {
        await createOne(p);
    }
    console.log("\nTayyor.");
}
run();
