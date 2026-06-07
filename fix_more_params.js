const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixMoreParams() {
    // 1. Ko'rsatkich -> translate "Operation mode indication"
    const { data: kParam } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Ko\'rsatkich').single();
    if (kParam) {
        await supabase.from('product_param_values').update({ value: 'Ishlash rejimini ko\'rsatish' }).match({ param_id: kParam.id, value: 'Operation mode indication' });
        const newVals = (kParam.predefined_values || []).map(v => v === 'Operation mode indication' ? 'Ishlash rejimini ko\'rsatish' : v);
        await supabase.from('category_params').update({ predefined_values: newVals }).eq('id', kParam.id);
    }
    
    // 2. Qo'shimchalar -> translate "cylindrical" to "Tsilindrsimon"
    const { data: qParam } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Qo\'shimchalar').single();
    if (qParam) {
        await supabase.from('product_param_values').update({ value: 'Tsilindrsimon' }).match({ param_id: qParam.id, value: 'cylindrical' });
        const newVals = (qParam.predefined_values || []).map(v => v === 'cylindrical' ? 'Tsilindrsimon' : v);
        await supabase.from('category_params').update({ predefined_values: newVals }).eq('id', qParam.id);
    }
    
    // 3. Merge "Soch quritgichining kuchi, Vt" into "Quvvat, Vt"
    // Since they might be in different categories, just renaming the category_params is enough
    const { data: sParams } = await supabase.from('category_params').select('id').eq('name_uz', 'Soch quritgichining kuchi, Vt');
    if (sParams) {
        for (const p of sParams) {
            await supabase.from('category_params').update({ name_uz: 'Quvvat, Vt' }).eq('id', p.id);
        }
    }
    
    // Also, investigate the power '7' and '6' 
    // They are probably epilators/shavers where 6W or 7W is normal.
    
    // 4. Tarmoq simining uzunligi, m -> fix '25' to '2.5'
    const { data: lengthParams } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Tarmoq simining uzunligi, m');
    if (lengthParams) {
        for (const p of lengthParams) {
            await supabase.from('product_param_values').update({ value: '2.5' }).match({ param_id: p.id, value: '25' });
            if (p.predefined_values) {
                const newVals = p.predefined_values.map(v => v === '25' ? '2.5' : v);
                await supabase.from('category_params').update({ predefined_values: [...new Set(newVals)] }).eq('id', p.id);
            }
        }
    }
    
    // 5. Tezlik/rejimlar soni -> fix '23' and rename to "Tezlik soni"
    const { data: tParams } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Tezlik/rejimlar soni');
    if (tParams) {
        for (const p of tParams) {
            await supabase.from('product_param_values').delete().match({ param_id: p.id, value: '23' });
            if (p.predefined_values) {
                const newVals = p.predefined_values.filter(v => v !== '23');
                await supabase.from('category_params').update({ name_uz: 'Tezlik soni', predefined_values: newVals }).eq('id', p.id);
            } else {
                await supabase.from('category_params').update({ name_uz: 'Tezlik soni' }).eq('id', p.id);
            }
        }
    }
    
    // 6. Ultrium resursi, impulslar -> Rename to "Lazer resursi (chaqnashlar soni)"
    const { data: lParams } = await supabase.from('category_params').select('id').eq('name_uz', 'Ultrium resursi, impulslar');
    if (lParams) {
        for (const p of lParams) {
            await supabase.from('category_params').update({ name_uz: 'Lazer resursi (chaqnashlar soni)' }).eq('id', p.id);
        }
    }

    console.log("Cleanup complete!");
}

fixMoreParams();
