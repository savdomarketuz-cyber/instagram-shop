const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = JSON.parse(fs.readFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json'));

const targetMappings = {
  'uakeen toster light blue': { model: 'Toster', uz: 'Toster Uakeen (Havorang), non va buterbrod uchun, 1000W' },
  'uakeen toster dark blue': { model: 'Toster', uz: 'Toster Uakeen (To\'q ko\'k), non va buterbrod uchun, 1000W' },
  'uakeen toster qora': { model: 'Toster', uz: 'Toster Uakeen (Qora), non va buterbrod uchun, 1000W' },
  'uakeen toster oq': { model: 'Toster', uz: 'Toster Uakeen (Oq), non va buterbrod uchun, 1000W' },
  'uakeen toster qizil': { model: 'Toster', uz: 'Toster Uakeen (Qizil), non va buterbrod uchun, 1000W' },
  'uakeen toster bronza': { model: 'Toster', uz: 'Toster Uakeen (Bronza), non va buterbrod uchun, 1000W' },
  
  'uakeen toster diplay qora': { model: 'Toster Display', uz: 'Toster Uakeen (Qora, Displeyli), non va buterbrod uchun, 1000W' },
  'uakeen toster display oq': { model: 'Toster Display', uz: 'Toster Uakeen (Oq, Displeyli), non va buterbrod uchun, 1000W' },
  'uakeen toster display beige': { model: 'Toster Display', uz: 'Toster Uakeen (Bej, Displeyli), non va buterbrod uchun, 1000W' }
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
        'Материал корпуса': 'Korpusi', 'Управление': 'Boshqaruvi', 
        'Количество степеней обжаривания': 'Qovurish darajalari soni',
        'Количество тостов': 'Tosterlar soni'
    };
    
    const valDict = {
        'белый': 'oq', 'черный': 'qora', 'красный': 'qizil', 'голубой': 'havorang', 'синий': 'ko\'k',
        'бежевый': 'bej', 'бронза': 'bronza',
        'пластик': 'plastik', 'металл': 'metall', 'электронное': 'elektron', 'механическое': 'mexanik'
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
    
    // Check if category "Tosterlar" exists, if not create
    const catId = await getOrCreateCategory('Tosterlar');
    const brandId = await getOrCreateBrand('Uakeen');
    
    for(let item of itemsToImport) {
        const mapInfo = targetMappings[item.sku.toLowerCase().trim()];
        
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
            barcode: `UAKEEN-${mapInfo.model}`.toUpperCase().replace(/\s+/g, '-'),
            price: item.price,
            old_price: item.old_price,
            images: item.images,
            image: item.images && item.images.length > 0 ? item.images[0] : null,
            sku: item.sku.toUpperCase(),
            group_id: `custom-uakeen-${mapInfo.model}`.toLowerCase().replace(/\s+/g, '-'),
            is_deleted: false,
            created_at: new Date().toISOString()
        };
        
        const { error: pErr } = await supabase.from('products').insert(productData);
        if(pErr) {
            console.error(`Error inserting ${item.sku}:`, pErr.message);
        } else {
            console.log(`Inserted: [Tosterlar] ${mapInfo.uz}`);
            count++;
        }
    }
    
    const remainingData = data.filter(item => !targetKeys.includes(item.sku.toLowerCase().trim()));
    fs.writeFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json', JSON.stringify(remainingData, null, 2));
    
    console.log(`\nDone! Inserted ${count} items.`);
    console.log(`Removed them from qolgan_mahsulotlar_toza.json. Remaining: ${remainingData.length}`);
}

run().catch(console.error);
