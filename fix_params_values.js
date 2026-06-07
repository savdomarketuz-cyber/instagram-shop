const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixData() {
    // 1. Rename "Batareya muddati, min." -> "Batareya ishlash muddati, min."
    await supabase.from('category_params').update({ name_uz: 'Batareya ishlash muddati, min.' }).eq('name_uz', 'Batareya muddati, min.');
    
    // 2. Rename "Cho'tkasi materiali" -> "Cho'tka materiali"
    await supabase.from('category_params').update({ name_uz: 'Cho\'tka materiali' }).eq('name_uz', 'Cho\'tkasi materiali');
    
    // Remove "1" from Cho'tka materiali product values
    const { data: paramChotka } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Cho\'tka materiali').single();
    if (paramChotka) {
        await supabase.from('product_param_values').delete().match({ param_id: paramChotka.id, value: '1' });
        const newPredefined = paramChotka.predefined_values.filter(v => v !== '1');
        await supabase.from('category_params').update({ predefined_values: newPredefined }).eq('id', paramChotka.id);
    }
    
    // 3. Forseps turi -> "Ployka (qisqich) turi"
    await supabase.from('category_params').update({ name_uz: 'Ployka (qisqich) turi' }).eq('name_uz', 'Forseps turi');
    
    const { data: paramPloyka } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Ployka (qisqich) turi').single();
    if (paramPloyka) {
        // update values in product_param_values
        await supabase.from('product_param_values').update({ value: 'Ko\'p uslubli (multistayler)' }).match({ param_id: paramPloyka.id, value: 'ko\'p uslubli forseps turi' });
        await supabase.from('product_param_values').update({ value: 'Jingalak qilish uchun' }).match({ param_id: paramPloyka.id, value: 'jingalak temir qisqich turi' });
        
        const newVals = paramPloyka.predefined_values.map(v => {
            if (v === 'ko\'p uslubli forseps turi') return 'Ko\'p uslubli (multistayler)';
            if (v === 'jingalak temir qisqich turi') return 'Jingalak qilish uchun';
            return v;
        });
        await supabase.from('category_params').update({ predefined_values: newVals }).eq('id', paramPloyka.id);
    }
    
    // 4. Harorat rejimlari soni -> investigate 20 and 23
    const { data: paramHarorat } = await supabase.from('category_params').select('id').eq('name_uz', 'Harorat rejimlari soni').single();
    if (paramHarorat) {
        const { data: suspectProducts } = await supabase.from('product_param_values')
            .select('product_id, value, products(name)')
            .eq('param_id', paramHarorat.id)
            .in('value', ['20', '23', '10']);
        console.log("Products with suspicious temperature modes:", JSON.stringify(suspectProducts, null, 2));
    }
    
    // 5. Qo'llash sohasi: 'the face list' -> 'Yuz uchun'
    const { data: paramSoha } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Qo\'llash sohasi').single();
    if (paramSoha) {
        await supabase.from('product_param_values').update({ value: 'Yuz uchun' }).match({ param_id: paramSoha.id, value: 'the face list' });
        const newVals = paramSoha.predefined_values.map(v => v === 'the face list' ? 'Yuz uchun' : v);
        await supabase.from('category_params').update({ predefined_values: newVals }).eq('id', paramSoha.id);
    }
    
    // 6. Qo'shimcha funktsiyalar translation
    const translationMap = {
        'the highlight list': 'Yoritish (podsvetka)',
        'the ionization list': 'Ionizatsiya',
        'the fast heating list': 'Tez qizish',
        'the overheating protection list': 'Haddan tashqari issiqlikdan himoya',
        'the automatic shutdown list': 'Avtomatik o\'chish',
        'bikini sohasida uslublar ro\'yxatidan qiymatni tanlang': 'Bikini zonasi dizayni',
        'sovuq havo ta\'minoti': 'Sovuq havo uzatish'
    };
    
    const { data: paramQoshimcha } = await supabase.from('category_params').select('id, predefined_values').eq('name_uz', 'Qo\'shimcha funktsiyalar').single();
    if (paramQoshimcha) {
        let newValsSet = new Set(paramQoshimcha.predefined_values);
        
        for (const [oldVal, newVal] of Object.entries(translationMap)) {
            await supabase.from('product_param_values').update({ value: newVal }).match({ param_id: paramQoshimcha.id, value: oldVal });
            if (newValsSet.has(oldVal)) {
                newValsSet.delete(oldVal);
                newValsSet.add(newVal);
            }
        }
        await supabase.from('category_params').update({ predefined_values: [...newValsSet] }).eq('id', paramQoshimcha.id);
    }
    
    console.log("Fixes applied successfully.");
}

fixData();
