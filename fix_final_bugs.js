const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const deepReplaceMap = {
    'Operation mode indication': 'Ishlash rejimini ko\'rsatish',
    'cylindrical': 'Tsilindrsimon',
    'hairbrush': 'Soch cho\'tkasi',
    'spot epilasyon uchun': 'Nuqtali epilyatsiya',
    '450': '230' // 450F -> 230C
};

async function fixFinalBugs() {
    // We will do a full string replace on product_param_values and category_params.predefined_values
    const { data: allVals } = await supabase.from('product_param_values').select('id, param_id, value');
    
    for (const item of allVals) {
        let newVal = item.value;
        let changed = false;
        
        for (const [en, uz] of Object.entries(deepReplaceMap)) {
            // Be careful with replacing '450' everywhere, only if the param is temperature
            if (en === '450') {
                const { data: paramInfo } = await supabase.from('category_params').select('name_uz').eq('id', item.param_id).single();
                if (paramInfo && paramInfo.name_uz === 'Maksimal isitish harorati, °C') {
                    if (newVal === '450') {
                        newVal = '230';
                        changed = true;
                    }
                }
            } else if (newVal && newVal.includes(en)) {
                newVal = newVal.replace(new RegExp(en, 'g'), uz);
                changed = true;
            }
        }
        
        if (changed) {
            await supabase.from('product_param_values').update({ value: newVal }).eq('id', item.id);
        }
    }

    const { data: params } = await supabase.from('category_params').select('id, name_uz, predefined_values');
    for (const param of params) {
        if (!param.predefined_values) continue;
        
        let newPredefined = [];
        let changed = false;
        
        for (let v of param.predefined_values) {
            let newVal = v;
            for (const [en, uz] of Object.entries(deepReplaceMap)) {
                if (en === '450') {
                     if (param.name_uz === 'Maksimal isitish harorati, °C' && newVal === '450') {
                         newVal = '230';
                         changed = true;
                     }
                } else if (newVal && newVal.includes(en)) {
                    newVal = newVal.replace(new RegExp(en, 'g'), uz);
                    changed = true;
                }
            }
            newPredefined.push(newVal);
        }
        
        if (changed) {
            await supabase.from('category_params').update({ predefined_values: [...new Set(newPredefined)] }).eq('id', param.id);
        }
    }
    console.log("Final string fixes applied.");
}
fixFinalBugs();
