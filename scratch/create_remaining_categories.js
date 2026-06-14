const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const newCategories = [
    { id: '517', name: 'Vafli pishirgichlar', name_uz: 'Vafli pishirgichlar', name_ru: 'Вафельницы', parent_id: '5' },
    { id: '518', name: 'Multivarkalar', name_uz: 'Multivarkalar', name_ru: 'Мультиварки', parent_id: '5' },
    { id: '519', name: 'Mini pechlar', name_uz: 'Mini pechlar', name_ru: 'Мини-печи', parent_id: '5' },
    { id: '520', name: 'Sendvich tayyorlagichlar', name_uz: 'Sendvich tayyorlagichlar', name_ru: 'Бутербродницы', parent_id: '5' },
    { id: '521', name: 'Termopotlar', name_uz: 'Termopotlar', name_ru: 'Термопоты', parent_id: '5' },
    { id: '522', name: 'Kofe maydalagichlar', name_uz: 'Kofe maydalagichlar', name_ru: 'Кофемолки', parent_id: '5' },
    { id: '523', name: 'Kofe aksessuarlari', name_uz: 'Kofe aksessuarlari', name_ru: 'Кофейные аксессуары', parent_id: '5' },
    { id: '524', name: 'Oshxona kombaynlari', name_uz: 'Oshxona kombaynlari', name_ru: 'Кухонные комбайны', parent_id: '5' },
    { id: '525', name: 'Bug\'lagichlar', name_uz: 'Bug\'lagichlar', name_ru: 'Пароварки', parent_id: '5' },
    { id: '526', name: 'Muz generatorlari', name_uz: 'Muz generatorlari', name_ru: 'Льдогенераторы', parent_id: '5' },
    { id: '527', name: 'Elektr plitalar', name_uz: 'Elektr plitalar', name_ru: 'Электроплиты', parent_id: '5' },
    { id: '528', name: 'Frityurnitsalar', name_uz: 'Frityurnitsalar', name_ru: 'Фритюрницы', parent_id: '5' },
    { id: '529', name: 'Meva quritgichlar', name_uz: 'Meva quritgichlar', name_ru: 'Сушилки для овощей и фруктов', parent_id: '5' },
    { id: '530', name: 'Non pishirgichlar', name_uz: 'Non pishirgichlar', name_ru: 'Хлебопечки', parent_id: '5' },
    { id: '531', name: 'Vakuum qadoqlagichlar', name_uz: 'Vakuum qadoqlagichlar', name_ru: 'Вакууматоры', parent_id: '5' },
    { id: '532', name: 'Sixlar va kabob aksessuarlari', name_uz: 'Sixlar va kabob aksessuarlari', name_ru: 'Шампуры и аксессуары для шашлыка', parent_id: '5' },
    { id: '533', name: 'Boshqa aksessuarlar', name_uz: 'Boshqa aksessuarlar', name_ru: 'Другие аксессуары', parent_id: '5' },
    { id: '534', name: 'Chopper va maydalagichlar', name_uz: 'Chopper va maydalagichlar', name_ru: 'Чопперы и измельчители', parent_id: '5' }
];

async function run() {
    console.log("=== CREATING ALL MISSING CATEGORIES IN SUPABASE ===");

    for (const cat of newCategories) {
        // Check if category already exists
        const { data: exist } = await supabase.from('categories').select('id').eq('id', cat.id);
        if (exist && exist.length > 0) {
            console.log(`Category "${cat.name_uz}" (ID: ${cat.id}) already exists. Skipping.`);
            continue;
        }

        console.log(`Creating category: "${cat.name_uz}" (ID: ${cat.id})`);
        const { error } = await supabase.from('categories').insert({
            id: cat.id,
            name: cat.name,
            name_uz: cat.name_uz,
            name_ru: cat.name_ru,
            parent_id: cat.parent_id,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error(`  Error creating category ${cat.name_uz}:`, error.message);
        } else {
            console.log(`  Successfully created!`);
        }
    }
    console.log("\nAll categories processed!");
}

run().catch(console.error);
