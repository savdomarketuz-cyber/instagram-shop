const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const translationMap = {
    'the highlight list': 'Yoritish (podsvetka)',
    'the ionization list': 'Ionizatsiya',
    'the fast heating list': 'Tez qizish',
    'the overheating protection list': 'Haddan tashqari issiqlikdan himoya',
    'the automatic shutdown list': 'Avtomatik o\'chish',
    'bikini sohasida uslublar ro\'yxatidan qiymatni tanlang': 'Bikini zonasi dizayni',
    'sovuq havo ta\'minoti': 'Sovuq havo uzatish',
    'the face list': 'Yuz uchun',
    'from the battery': 'Batareyadan',
    'batareya / tarmoq ro\'yxatidan qiymatni tanlang': 'Batareya va tarmoqdan',
    'of the display': 'Displey mavjud',
    'the corrugation list': 'Gofre uchun',
    'the brush list': 'Cho\'tka',
    'the diffuser': 'Diffuzor'
};

async function replaceSubstrings() {
    const { data: allVals } = await supabase.from('product_param_values').select('id, param_id, value');
    
    for (const item of allVals) {
        let newVal = item.value;
        let changed = false;
        
        for (const [en, uz] of Object.entries(translationMap)) {
            if (newVal && newVal.includes(en)) {
                newVal = newVal.replace(new RegExp(en, 'g'), uz);
                changed = true;
            }
        }
        
        if (changed) {
            await supabase.from('product_param_values').update({ value: newVal }).eq('id', item.id);
        }
    }

    const { data: params } = await supabase.from('category_params').select('id, predefined_values');
    for (const param of params) {
        if (!param.predefined_values) continue;
        
        let newPredefined = [];
        let changed = false;
        
        for (let v of param.predefined_values) {
            let newVal = v;
            for (const [en, uz] of Object.entries(translationMap)) {
                if (newVal && newVal.includes(en)) {
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
    console.log("Deep translations applied.");
}
replaceSubstrings();
