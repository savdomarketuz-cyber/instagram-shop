const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = JSON.parse(fs.readFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json'));

const targetMappings = {
  'uakeen elektr-ch oq': { brand: 'Uakeen', model: 'Elektr choynak', uz: 'Elektr choynak Uakeen 2200W (Oq)' },
  'sonifer sf-2025': { brand: 'Sonifer', model: 'SF-2025', uz: 'Elektr choynak Sonifer SF-2025, 1.8 L' },
  'uakeen elektr-ch red': { brand: 'Uakeen', model: 'Elektr choynak', uz: 'Elektr choynak Uakeen 2200W (Qizil)' },
  'uakeen elektr-ch dark blue': { brand: 'Uakeen', model: 'Elektr choynak', uz: 'Elektr choynak Uakeen 2200W (To\'q ko\'k)' },
  'uakeen elektr-ch qora': { brand: 'Uakeen', model: 'Elektr choynak', uz: 'Elektr choynak Uakeen 2200W (Qora)' },
  'uakeen elektr-ch light blue': { brand: 'Uakeen', model: 'Elektr choynak', uz: 'Elektr choynak Uakeen 2200W (Havorang)' },
  'uakeen elektr-ch bronza': { brand: 'Uakeen', model: 'Elektr choynak', uz: 'Elektr choynak Uakeen 2200W (Bronza)' },

  'uakeen elekter-ch display oq': { brand: 'Uakeen', model: 'Elektr choynak Display', uz: 'Elektr choynak Uakeen (Oq, Displeyli), harorat nazorati' },
  'uakeen elektr-ch display beige': { brand: 'Uakeen', model: 'Elektr choynak Display', uz: 'Elektr choynak Uakeen (Bej, Displeyli), harorat nazorati' },
  'uakeen elektre-ch display qora': { brand: 'Uakeen', model: 'Elektr choynak Display', uz: 'Elektr choynak Uakeen (Qora, Displeyli), harorat nazorati' }
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
        'Объем, л': 'Hajmi (litr)', 'Материал корпуса': 'Korpusi', 'Тип': 'Turi',
        'Управление': 'Boshqaruvi', 'Системы защиты': 'Himoya tizimi'
    };
    
    const valDict = {
        'белый': 'oq', 'черный': 'qora', 'красный': 'qizil', 'голубой': 'havorang', 'синий': 'ko\'k',
        'бежевый': 'bej', 'бронза': 'bronza', 'стекло': 'shisha',
        'пластик': 'plastik', 'металл': 'metall', 'нержавеющая сталь': 'zanglamaydigan po\'lat',
        'механическое': 'mexanik', 'электронное': 'elektron', 'автоотключение': 'avtomatik o\'chish',
        'от перегрева': 'qizib ketishdan himoya', 'от включения без воды': 'suvsiz ishlashdan himoya'
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
    
    // Check if category "Elektr choynaklar (Tefal)" exists, if not create
    const catId = await getOrCreateCategory('Elektr choynaklar (Tefal)');
    
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
            console.log(`Inserted: [Elektr choynaklar] ${mapInfo.uz}`);
            count++;
        }
    }
    
    const remainingData = data.filter(item => !targetKeys.includes(item.sku.toLowerCase().trim()));
    fs.writeFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json', JSON.stringify(remainingData, null, 2));
    
    console.log(`\nDone! Inserted ${count} items.`);
    console.log(`Removed them from qolgan_mahsulotlar_toza.json. Remaining: ${remainingData.length}`);
}

run().catch(console.error);
