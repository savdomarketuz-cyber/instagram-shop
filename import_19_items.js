const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = JSON.parse(fs.readFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json'));

const mappings = {
  // Elektr choynaklar (Tefal)
  'sonifer sf-2025 blue': 'Elektr choynaklar (Tefal)',
  'sf-2025 white': 'Elektr choynaklar (Tefal)',
  'sonifer sf-2025 red': 'Elektr choynaklar (Tefal)',
  'sonifer sf-2079': 'Elektr choynaklar (Tefal)',
  'sonifer sf-2072 red': 'Elektr choynaklar (Tefal)',
  'sonifer sf-2072 black': 'Elektr choynaklar (Tefal)',
  'sonifer sf-2035': 'Elektr choynaklar (Tefal)',

  // Blenderlar
  'blender bosch': 'Blenderlar',
  'blender samsung': 'Blenderlar',
  'sonifer sf-8006': 'Blenderlar',
  'blender lg svet': 'Blenderlar',

  // Kofe mashinalari
  'sonifer sf-3602': 'Kofe mashinalari',
  'sonifer sf-3583': 'Kofe mashinalari',
  'kofemolka sonifer sf-3507': 'Kofe mashinalari',
  'sonifer sf-3567': 'Kofe mashinalari',

  // Kombayn va maydalagichlar
  'sonifer sf-8187': 'Kombayn va maydalagichlar',
  'kombayn 4in1 bosch': 'Kombayn va maydalagichlar',
  'chopper bosch bs-888': 'Kombayn va maydalagichlar',
  'chopper sonifer sf-8123': 'Kombayn va maydalagichlar'
};

async function getOrCreateCategory(catName) {
    const { data: exist } = await supabase.from('categories').select('id').eq('name', catName).single();
    if(exist) return exist.id;
    
    console.log(`Creating category: ${catName}`);
    const { data, error } = await supabase.from('categories').insert({
        id: Date.now().toString() + Math.floor(Math.random()*1000),
        name: catName, name_uz: catName, name_ru: catName, parent_id: '1'
    }).select('id').single();
    if(error) throw error;
    return data.id;
}

async function getOrCreateBrand(brandName) {
    const bName = brandName.trim() || 'Unknown';
    const { data: exist } = await supabase.from('brands').select('id').ilike('name', bName).limit(1);
    if(exist && exist.length > 0) return exist[0].id;
    
    console.log(`Creating brand: ${bName}`);
    const { data, error } = await supabase.from('brands').insert({
        id: require('crypto').randomUUID(),
        name: bName
    }).select('id').single();
    if(error) throw error;
    return data.id;
}

// Function to translate Russian parameter keys and format as HTML
function translateParams(params, weight, dimensions) {
    let result = '';
    
    const dict = {
        'Цвет товара': 'Rangi',
        'Бренд': 'Brend',
        'Мощность, Вт': 'Quvvati (Vt)',
        'Объем, мл': 'Hajmi (ml)',
        'Материал корпуса': 'Korpusi',
        'Тип': 'Turi',
        'Управление': 'Boshqaruvi',
        'Вес товара, г': 'Og\'irligi (gr)'
    };
    
    const valDict = {
        'белый': 'oq', 'черный': 'qora', 'серебристый': 'kumushrang', 'красный': 'qizil',
        'синий': 'ko\'k', 'зеленый': 'yashil', 'желтый': 'sariq', 'серый': 'kulrang',
        'стекло': 'shisha', 'пластик': 'plastik', 'металл': 'metall', 'нержавеющая сталь': 'zanglamaydigan po\'lat',
        'механическое': 'mexanik', 'электронное': 'elektron'
    };

    let pList = [];
    if(weight) pList.push(`<li><b>Og'irligi:</b> ${weight} kg</li>`);
    if(dimensions) pList.push(`<li><b>O'lchamlari:</b> ${dimensions} sm</li>`);

    for(let [k,v] of Object.entries(params || {})) {
        let key = dict[k] || k;
        let value = String(v).toLowerCase();
        let translatedVal = Object.keys(valDict).reduce((acc, ru) => acc.replace(new RegExp(ru, 'gi'), valDict[ru]), value);
        pList.push(`<li><b>${key}:</b> ${translatedVal}</li>`);
    }

    if(pList.length > 0) {
        result = `<ul>${pList.join('')}</ul>`;
    }
    return result;
}

async function run() {
    let count = 0;
    
    // Process items in the mapping
    const targetKeys = Object.keys(mappings);
    const itemsToImport = data.filter(item => targetKeys.includes(item.sku.toLowerCase().trim()));
    
    for(let item of itemsToImport) {
        const mappedCat = mappings[item.sku.toLowerCase().trim()];
        const catId = await getOrCreateCategory(mappedCat);
        const brandId = await getOrCreateBrand(item.brand);
        
        // Translate name
        let name_uz = item.name_ru;
        name_uz = name_uz.replace(/Чайник/i, "Elektr choynak");
        name_uz = name_uz.replace(/Электрический чайник/i, "Elektr choynak");
        name_uz = name_uz.replace(/Блендер и кофемолка/i, "Blender va Kofe maydalagich");
        name_uz = name_uz.replace(/Стационарный блендер/i, "Stol usti blenderi");
        name_uz = name_uz.replace(/Измельчитель чоппер/i, "Maydalagich chopper");
        name_uz = name_uz.replace(/Измельчитель/i, "Maydalagich");
        name_uz = name_uz.replace(/Соковыжималка/i, "Kombayn 4 tasi 1 da");
        name_uz = name_uz.replace(/Кофемолка/i, "Kofe maydalagich");

        const paramsHtml = translateParams(item.parameters, item.weight, item.dimensions);
        let desc_uz = item.desc_ru ? item.desc_ru + '<br><br>' + paramsHtml : paramsHtml;

        let productData = {
            id: require('crypto').randomUUID(),
            name: name_uz,
            name_uz: name_uz,
            name_ru: item.name_ru,
            description_uz: desc_uz,
            description_ru: item.desc_ru,
            category_id: catId,
            brand_id: brandId,
            model: item.model || item.sku,
            barcode: `${item.brand || 'UNK'}-${item.model || item.sku}`.toUpperCase(),
            price: item.price,
            old_price: item.old_price,
            images: item.images,
            image: item.images && item.images.length > 0 ? item.images[0] : null,
            sku: item.sku.toUpperCase(),
            group_id: `custom-${item.brand || 'unk'}-${item.model || item.sku}`.toLowerCase(),
            is_deleted: false,
            created_at: new Date().toISOString()
        };
        
        const { error: pErr } = await supabase.from('products').insert(productData);
        if(pErr) {
            console.error(`Error inserting ${item.sku}:`, pErr.message);
        } else {
            console.log(`Inserted: [${mappedCat}] ${name_uz}`);
            count++;
        }
    }
    
    // Remove inserted items from the master JSON file
    const remainingData = data.filter(item => !targetKeys.includes(item.sku.toLowerCase().trim()));
    fs.writeFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json', JSON.stringify(remainingData, null, 2));
    
    console.log(`\nDone! Inserted ${count} items.`);
    console.log(`Removed them from qolgan_mahsulotlar_toza.json. Remaining: ${remainingData.length}`);
}

run().catch(console.error);
