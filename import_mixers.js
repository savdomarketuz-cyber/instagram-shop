const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = JSON.parse(fs.readFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json'));

const targetSkus = [
  'sf-7034', 'sonifer sf-7017', 'sonifer sf-7021', 
  'sonifer sf-7024', 'mikser bosch', 'sonifer sf-7077'
];

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
        'Материал корпуса': 'Korpusi', 'Тип': 'Turi', 'Управление': 'Boshqaruvi', 
        'Количество скоростей': 'Tezliklar sonи', 'Насадки приборов для готовки': 'Qo\'shimchalar (Nasatkalar)',
        'Системы защиты': 'Himoya tizimi'
    };
    
    const valDict = {
        'белый': 'oq', 'черный': 'qora', 'серебристый': 'kumushrang', 'красный': 'qizil',
        'пластик': 'plastik', 'металл': 'metall', 'нержавеющая сталь': 'zanglamaydigan po\'lat',
        'ручной': 'qo\'l uchun', 'для взбивания': 'ko\'pirtirish uchun', 'венчик': 'venchik'
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
    const itemsToImport = data.filter(item => targetSkus.includes(item.sku.toLowerCase().trim()));
    const catId = await getOrCreateCategory('Mikserlar');
    
    for(let item of itemsToImport) {
        // Fix Brand and Model manually
        let brandName = item.brand;
        let modelName = item.model;
        if(item.sku.toLowerCase() === 'mikser bosch') {
            brandName = 'Bosch';
            modelName = 'BS';
        }
        
        const brandId = await getOrCreateBrand(brandName);
        
        // Translate name
        let name_uz = item.name_ru;
        name_uz = name_uz.replace(/Миксер нручой/i, "Qo'l mikseri");
        name_uz = name_uz.replace(/Миксер ручной/i, "Qo'l mikseri");
        name_uz = name_uz.replace(/Миксер/i, "Mikser");

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
            model: modelName,
            barcode: `${brandName}-${modelName}`.toUpperCase().replace(/\s+/g, '-'),
            price: item.price,
            old_price: item.old_price,
            images: item.images,
            image: item.images && item.images.length > 0 ? item.images[0] : null,
            sku: item.sku.toUpperCase(),
            group_id: `custom-${brandName}-${modelName}`.toLowerCase().replace(/\s+/g, '-'),
            is_deleted: false,
            created_at: new Date().toISOString()
        };
        
        const { error: pErr } = await supabase.from('products').insert(productData);
        if(pErr) {
            console.error(`Error inserting ${item.sku}:`, pErr.message);
        } else {
            console.log(`Inserted: [Mikserlar] ${name_uz}`);
            count++;
        }
    }
    
    const remainingData = data.filter(item => !targetSkus.includes(item.sku.toLowerCase().trim()));
    fs.writeFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json', JSON.stringify(remainingData, null, 2));
    
    console.log(`\nDone! Inserted ${count} items.`);
    console.log(`Removed them from qolgan_mahsulotlar_toza.json. Remaining: ${remainingData.length}`);
}

run().catch(console.error);
