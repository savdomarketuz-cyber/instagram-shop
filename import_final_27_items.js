const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = JSON.parse(fs.readFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json'));

async function getOrCreateCategory(catName, parentId) {
    const { data: exist } = await supabase.from('categories').select('id').eq('name', catName).single();
    if(exist) return exist.id;
    
    console.log(`Creating category: ${catName} under Parent: ${parentId}`);
    const { data: cData, error } = await supabase.from('categories').insert({
        id: Date.now().toString() + Math.floor(Math.random()*1000),
        name: catName, name_uz: catName, name_ru: catName, parent_id: parentId
    }).select('id').single();
    if(error) throw error;
    return cData.id;
}

async function getOrCreateBrand(brandName) {
    if(!brandName || brandName === 'Нет бренда') brandName = 'Nomsiz';
    const { data: exist } = await supabase.from('brands').select('id').ilike('name', brandName).limit(1);
    if(exist && exist.length > 0) return exist[0].id;
    
    console.log(`Creating brand: ${brandName}`);
    const { data: bData, error } = await supabase.from('brands').insert({
        id: require('crypto').randomUUID(),
        name: brandName
    }).select('id').single();
    if(error) throw error;
    return bData.id;
}

function translateParams(params, weight, dimensions) {
    let result = '';
    const dict = {
        'Цвет товара': 'Rangi', 'Бренд': 'Brend', 'Мощность, Вт': 'Quvvati (Vt)',
        'Объем, л': 'Hajmi (litr)', 'Материал корпуса': 'Korpusi', 'Тип': 'Turi',
        'Управление': 'Boshqaruvi', 'Системы защиты': 'Himoya tizimi',
        'Емкость аккумулятора, мАч': 'Akkumulyator sig\'imi (mAh)', 'Время автономной работы, ч': 'Ishlash vaqti (soat)'
    };
    
    const valDict = {
        'белый': 'oq', 'черный': 'qora', 'красный': 'qizil', 'синий': 'ko\'k',
        'пластик': 'plastik', 'металл': 'metall', 'нержавеющая сталь': 'zanglamaydigan po\'lat',
        'механическое': 'mexanik', 'электронное': 'elektron', 'от перегрева': 'qizib ketishdan himoya'
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
    
    // Check if categories exist, if not create them under proper parent
    // Parent 2 -> Elektronika, Parent 5 -> Maishiy texnika
    const catBlender = await getOrCreateCategory('Qo\'l blenderlari', '5');
    const catJuicer = await getOrCreateCategory('Sharbat chiqargichlar', '5');
    const catSpeaker = await getOrCreateCategory('Portativ kalonkalar', '2');
    
    for(let item of data) {
        let sku = item.sku.toLowerCase();
        let name_ru = item.name_ru.toLowerCase();
        
        let catId = '';
        let catName = '';
        if(sku.includes('kalonka') || sku.includes('chamadon') || name_ru.includes('колонка')) {
            catId = catSpeaker; catName = 'Portativ kalonkalar';
        } else if(sku.includes('sokovjimalka') || sku.includes('sokvjimalka') || name_ru.includes('соковыжималка')) {
            catId = catJuicer; catName = 'Sharbat chiqargichlar';
        } else {
            catId = catBlender; catName = 'Qo\'l blenderlari';
        }
        
        let brandName = item.brand;
        let modelName = item.model || item.sku;
        
        // Manual fix for brand/model from name if poorly parsed
        if(sku.includes('sokovjimalka samsung')) {
            brandName = 'Bemonde'; modelName = 'BM-JE1013';
        } else if(sku.includes('sokvjimalka samsung')) {
            brandName = 'Samsung'; modelName = 'Sharbat chiqargich';
        } else if(sku.includes('sokvjimalka bosch')) {
            brandName = 'Bosch'; modelName = 'Sharbat chiqargich';
        } else if(sku.includes('zqs')) {
            brandName = 'Sing-e'; 
            let m = sku.match(/zqs\s*(\d+)/i);
            modelName = m ? `ZQS-${m[1]}` : 'ZQS';
        } else if(brandName === 'Нет бренда' || !brandName) {
            brandName = 'Nomsiz';
        }
        
        // Simple uzbek translations
        let name_uz = item.name_ru;
        name_uz = name_uz.replace(/Блендер погружной ручной/gi, "Qo'l blenderi");
        name_uz = name_uz.replace(/Погружной блендер/gi, "Qo'l blenderi");
        name_uz = name_uz.replace(/Ручной блендер/gi, "Qo'l blenderi");
        name_uz = name_uz.replace(/Блендер/gi, "Blender");
        name_uz = name_uz.replace(/Соковыжималка/gi, "Sharbat chiqargich");
        name_uz = name_uz.replace(/Колонка портативная караоке/gi, "Portativ karaoke kalonka");
        name_uz = name_uz.replace(/Караоке-колонка/gi, "Karaoke kalonka");
        name_uz = name_uz.replace(/Музыкальная колонка/gi, "Musiqiy kalonka");
        name_uz = name_uz.replace(/Портативная колонка/gi, "Portativ kalonka");
        name_uz = name_uz.replace(/беспроводная колонка/gi, "simsiz kalonka");

        const brandId = await getOrCreateBrand(brandName);
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
            model: modelName.length > 50 ? modelName.substring(0,50) : modelName,
            barcode: `${brandName}-${modelName}`.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0,40),
            price: item.price,
            old_price: item.old_price,
            images: item.images,
            image: item.images && item.images.length > 0 ? item.images[0] : null,
            sku: item.sku.toUpperCase(),
            group_id: `custom-${brandName}-${modelName}`.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0,40),
            is_deleted: false,
            created_at: new Date().toISOString()
        };
        
        const { error: pErr } = await supabase.from('products').insert(productData);
        if(pErr) {
            console.error(`Error inserting ${item.sku}:`, pErr.message);
        } else {
            console.log(`Inserted: [${catName}] ${name_uz}`);
            count++;
        }
    }
    
    fs.writeFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json', JSON.stringify([], null, 2));
    
    console.log(`\nDone! Inserted ${count} items.`);
    console.log(`Removed all items from qolgan_mahsulotlar_toza.json. Remaining: 0`);
}

run().catch(console.error);
