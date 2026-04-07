import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Missing keys');
const supabase = createClient(supabaseUrl, supabaseKey);

const categoriesConfig = {
  "categories": [
    {
       "id": "cat-gozallik",
       "name_uz": "Go'zallik va parvarish",
       "name_ru": "Красота и уход",
       "image": "https://cdn-icons-png.flaticon.com/512/2808/2808381.png",
       "subcategories": [
         { "id": "sub-trimmer", "name_uz": "Trimmerlar", "name_ru": "Триммеры", "image": "https://cdn-icons-png.flaticon.com/512/7513/7513364.png" },
         { "id": "sub-fen", "name_uz": "Fenlar", "name_ru": "Фены", "image": "https://cdn-icons-png.flaticon.com/512/3757/3757626.png" },
         { "id": "sub-fen-shotka", "name_uz": "Fen-shotkalar", "name_ru": "Фен-щетки", "image": "https://cdn-icons-png.flaticon.com/512/10540/10540581.png" },
         { "id": "sub-styler", "name_uz": "Soch turmaklash (Styler)", "name_ru": "Стайлеры", "image": "https://cdn-icons-png.flaticon.com/512/3572/3572097.png" },
         { "id": "sub-epilyator", "name_uz": "Epilyatorlar", "name_ru": "Эпиляторы", "image": "https://cdn-icons-png.flaticon.com/512/2458/2458269.png" },
         { "id": "sub-soch-dazmoli", "name_uz": "Soch dazmollari", "name_ru": "Выпрямители для волос", "image": "https://cdn-icons-png.flaticon.com/512/3790/3790338.png" }
       ]
    },
    {
      "id": "cat-maishiy-texnika",
      "name_uz": "Maishiy texnika",
      "name_ru": "Бытовая техника",
      "image": "https://cdn-icons-png.flaticon.com/512/3133/3133379.png",
      "subcategories": [
        { "id": "107", "name_uz": "Mikserlar", "name_ru": "Миксеры", "image": "https://cdn-icons-png.flaticon.com/512/5707/5707186.png" },
        { "id": "sub-blender", "name_uz": "Blenderlar", "name_ru": "Блендеры", "image": "https://cdn-icons-png.flaticon.com/512/3414/3414733.png" },
        { "id": "sub-toster", "name_uz": "Tosterlar", "name_ru": "Тостеры", "image": "https://cdn-icons-png.flaticon.com/512/2165/2165072.png" },
        { "id": "sub-tefal", "name_uz": "Elektr choynaklar (Tefal)", "name_ru": "Электрочайники (Tefal)", "image": "https://cdn-icons-png.flaticon.com/512/3932/3932371.png" },
        { "id": "sub-kofe-mashina", "name_uz": "Kofe mashinalari", "name_ru": "Кофемашины", "image": "https://cdn-icons-png.flaticon.com/512/3238/3238640.png" },
        { "id": "sub-bugli-dazmol", "name_uz": "Bug'li dazmollar", "name_ru": "Отпариватели", "image": "https://cdn-icons-png.flaticon.com/512/2924/2924119.png" }
      ]
    }
  ]
};

async function saveRecursive(cats, pId = null) {
    for (const cat of cats) {
        const payload = {
            id: cat.id,
            name: cat.name_uz, // backward compatibility
            name_uz: cat.name_uz,
            name_ru: cat.name_ru || "",
            image: cat.image || null,
            parent_id: pId,
            is_deleted: false
        };
        console.log(`Inserting: ${cat.name_uz} (${cat.id})`);
        const { error } = await supabase.from("categories").upsert(payload);
        if (error) {
            console.error(`Failed to insert ${cat.id}:`, error);
        } else {
            if (cat.subcategories && Array.isArray(cat.subcategories)) {
                await saveRecursive(cat.subcategories, cat.id);
            }
        }
    }
}

async function main() {
    console.log('Starting seed...');
    await saveRecursive(categoriesConfig.categories);
    console.log('Done!');
}

main();
