const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = JSON.parse(fs.readFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json'));

const targetMappings = {
  'sonifer sf-9132 oq+qora': { brand: 'Sonifer', model: 'SF-9132', uz: 'Qo\'l bug\'li dazmoli Sonifer SF-9132, 1780 W, qora/oq' },
  'sonifer sf-9126': { brand: 'Sonifer', model: 'SF-9126', uz: 'Qo\'l bug\'li dazmoli Sonifer SF-9126, 1500 W' },
  'uakeen zl-220': { brand: 'Uakeen', model: 'ZL-220', uz: 'Kuchli qo\'l bug\'li dazmoli Uakeen ZL-220, 2000 W' },
  'uakeen zl-225 white': { brand: 'Uakeen', model: 'ZL-225', uz: 'Kuchli qo\'l bug\'li dazmoli Uakeen ZL-225, 2000 W (Oq)' },
  'uakeen zl-225 black': { brand: 'Uakeen', model: 'ZL-225', uz: 'Kuchli qo\'l bug\'li dazmoli Uakeen ZL-225, 2000 W (Qora)' },
  'sonifer sf-9090': { brand: 'Sonifer', model: 'SF-9090', uz: 'Elektr qo\'l bug\'li dazmoli Sonifer SF-9090, 1500 W' },
  'sonifer sf-9127': { brand: 'Sonifer', model: 'SF-9127', uz: 'Qo\'l bug\'li dazmoli Sonifer SF-9127, 2000 W' },
  'sonifer sf-9093': { brand: 'Sonifer', model: 'SF-9093', uz: 'Qo\'l bug\'li dazmoli Sonifer SF-9093, 1500 W' },
  
  'duvel m4': { brand: 'Duvel', model: 'M4', uz: 'Ko\'p funksiyali tik bug\'li dazmol Duvel M4, 1950 W' },
  'duvel m3': { brand: 'Duvel', model: 'M3', uz: 'Ko\'p funksiyali tik bug\'li dazmol Duvel M3, 1950 W' },
  'duvel m6': { brand: 'Duvel', model: 'M6', uz: 'Ko\'p funksiyali tik bug\'li dazmol Duvel M6, 1950 W' }
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
    const { data: exist } = await supabase.from('brands').select('id').ilike('name', brandName).limit(1);
    if(exist && exist.length > 0) return exist[0].id;
    
    console.log(`Creating brand: ${brandName}`);
    const { data, error } = await supabase.from('brands').insert({
        id: require('crypto').randomUUID(),
        name: brandName
    }).select('id').single();
    if(error) throw error;
    return data.id;
}

function translateParams(params, weight, dimensions) {
    let result = '';
    const dict = {
        'Цвет товара': 'Rangi', 'Бренд': 'Brend', 'Мощность, Вт': 'Quvvati (Vt)',
        'Материал корпуса': 'Korpusi', 'Тип': 'Turi', 'Управление': 'Boshqaruvi', 
        'Системы защиты': 'Himoya tizimi', 'Емкость резервуара для воды, мл': 'Suv idishining hajmi (ml)',
        'Подача пара, г/мин': 'Bug\' berish (g/min)'
    };
    
    const valDict = {
        'белый': 'oq', 'черный': 'qora', 'серебристый': 'kumushrang', 'красный': 'qizil',
        'пластик': 'plastik', 'металл': 'metall', 'нержавеющая сталь': 'zanglamaydigan po\'lat',
        'механическое': 'mexanik', 'электронное': 'elektron', 'ручной': 'qo\'l uchun',
        'напольный': 'tik (yerga qo\'yiladigan)'
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
    const targetKeys = Object.keys(targetMappings);
    const itemsToImport = data.filter(item => targetKeys.includes(item.sku.toLowerCase().trim()));
    
    // The existing category name in DB is "Bug'li dazmollar"
    const catId = await getOrCreateCategory('Bug\'li dazmollar');
    
    for(let item of itemsToImport) {
        const mapInfo = targetMappings[item.sku.toLowerCase().trim()];
        const brandId = await getOrCreateBrand(mapInfo.brand);
        
        const paramsHtml = translateParams(item.parameters, item.weight, item.dimensions);
        let desc_uz = item.desc_ru ? item.desc_ru + '<br><br>' + paramsHtml : paramsHtml;

        let productData = {
            id: require('crypto').randomUUID(),
            name: mapInfo.uz,
            name_uz: mapInfo.uz,
            name_ru: item.name_ru,
            description_uz: desc_uz,
            description_ru: item.desc_ru,
            category_id: catId,
            brand_id: brandId,
            model: mapInfo.model,
            barcode: `${mapInfo.brand}-${mapInfo.model}`.toUpperCase().replace(/\s+/g, '-'),
            price: item.price,
            old_price: item.old_price,
            images: item.images,
            image: item.images && item.images.length > 0 ? item.images[0] : null,
            sku: item.sku.toUpperCase(),
            group_id: `custom-${mapInfo.brand}-${mapInfo.model}`.toLowerCase().replace(/\s+/g, '-'),
            is_deleted: false,
            created_at: new Date().toISOString()
        };
        
        const { error: pErr } = await supabase.from('products').insert(productData);
        if(pErr) {
            console.error(`Error inserting ${item.sku}:`, pErr.message);
        } else {
            console.log(`Inserted: [Bug'li dazmollar] ${mapInfo.uz}`);
            count++;
        }
    }
    
    const remainingData = data.filter(item => !targetKeys.includes(item.sku.toLowerCase().trim()));
    fs.writeFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json', JSON.stringify(remainingData, null, 2));
    
    console.log(`\nDone! Inserted ${count} items.`);
    console.log(`Removed them from qolgan_mahsulotlar_toza.json. Remaining: ${remainingData.length}`);
}

run().catch(console.error);
