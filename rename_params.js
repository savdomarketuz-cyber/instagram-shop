const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function renameParam() {
    const { data, error } = await supabase
        .from('category_params')
        .update({
            name_uz: 'Quvvatlanish vaqti, soat',
            name_ru: 'Время зарядки, ч'
        })
        .eq('name_uz', 'Battery charge time, h');
        
    if (error) {
        console.error("Error renaming:", error);
    } else {
        console.log("Renamed successfully!");
    }
    
    // Also let's rename "Power Supply" and "Road" if they exist
    await supabase.from('category_params').update({ name_uz: 'Quvvat manbai turi', name_ru: 'Тип питания' }).eq('name_uz', 'Power Supply');
    await supabase.from('category_params').update({ name_uz: 'Safar uchun', name_ru: 'Дорожный' }).eq('name_uz', 'Road');
    await supabase.from('category_params').update({ name_uz: 'Pincetlar materiali', name_ru: 'Материал пинцетов' }).eq('name_uz', 'Cımbız materiali');
    await supabase.from('category_params').update({ name_uz: 'Pincetlar soni', name_ru: 'Число пинцетов' }).eq('name_uz', 'Cımbızlar soni');
    
    console.log("Fixed other translations too.");
}

renameParam();
