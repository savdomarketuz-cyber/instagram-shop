const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = JSON.parse(fs.readFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json'));

const targetMappings = {
  'sonifer sf-1920 black': { cat: 'Tarozilar', brand: 'Sonifer', model: 'SF-1920', uz: 'Smart elektron tarozi Sonifer SF-1920' },
  'sonifer sf-1913': { cat: 'Tarozilar', brand: 'Sonifer', model: 'SF-1913', uz: 'Elektron tarozi Sonifer SF-1913' },
  'sonifer sf-1920': { cat: 'Tarozilar', brand: 'Sonifer', model: 'SF-1920', uz: 'Smart elektron tarozi Sonifer SF-1920' },
  'sonifer sf-1913.': { cat: 'Tarozilar', brand: 'Sonifer', model: 'SF-1913', uz: 'Smart elektron tarozi Sonifer SF-1913' },
  'sonifer sf-1903': { cat: 'Tarozilar', brand: 'Sonifer', model: 'SF-1903', uz: 'Elektron tarozi Sonifer SF-1903' },
  
  'uakeen par dazmol qim': { cat: "Bug'li dazmollar", brand: 'Uakeen', model: 'Vertical Steamer', uz: "Tik bug'li dazmol Uakeen Germany" },
  'uakeen par damol ar': { cat: "Bug'li dazmollar", brand: 'Uakeen', model: 'Vertical Steamer', uz: "Tik bug'li dazmol Uakeen Germany, 2000W" },
  
  'sonifer sf-4049': { cat: "Mikroto'lqinli pechlar", brand: 'Sonifer', model: 'SF-4049', uz: "Mikroto'lqinli pech Sonifer SF-4049, 20L" },
  'sonifer sf-4050': { cat: "Mikroto'lqinli pechlar", brand: 'Sonifer', model: 'SF-4050', uz: "Mikroto'lqinli pech Sonifer SF-4050, 23L" },
  
  'uakeen zl-1713': { cat: 'Aerogrillar', brand: 'Uakeen', model: 'ZL-1713', uz: 'Aerogril Uakeen ZL-1713, 12L' },
  'uakeen airgril 10l': { cat: 'Aerogrillar', brand: 'Uakeen', model: 'Airgrill 10L', uz: 'Aerogril Uakeen, 10L' },
  
  'sonifer sf-8162': { cat: 'Kapuchinatorlar (Sut ko\'pirtirgichlar)', brand: 'Sonifer', model: 'SF-8162', uz: 'Sut ko\'pirtirgich (Kapuchinator) Sonifer SF-8162' },
  'sonifer sf-8154': { cat: 'Kapuchinatorlar (Sut ko\'pirtirgichlar)', brand: 'Sonifer', model: 'SF-8154', uz: 'Sut ko\'pirtirgich (Kapuchinator) Sonifer SF-8154' },
  'sonifer sf-8158': { cat: 'Kapuchinatorlar (Sut ko\'pirtirgichlar)', brand: 'Sonifer', model: 'SF-8158', uz: 'Sut ko\'pirtirgich (Kapuchinator) Sonifer SF-8158' }
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
        'Объем, мл': 'Hajmi (ml)', 'Материал корпуса': 'Korpusi', 'Тип': 'Turi',
        'Управление': 'Boshqaruvi', 'Вес товара, г': 'Og\'irligi (gr)',
        'Вместимость': 'Sig\'imi', 'Объем чаши, л': 'Hajmi (litr)', 'Системы защиты': 'Himoya tizimi'
    };
    
    const valDict = {
        'белый': 'oq', 'черный': 'qora', 'серебристый': 'kumushrang', 'красный': 'qizil',
        'синий': 'ko\'k', 'зеленый': 'yashil', 'желтый': 'sariq', 'серый': 'kulrang',
        'стекло': 'shisha', 'пластик': 'plastik', 'металл': 'metall', 'нержавеющая сталь': 'zanglamaydigan po\'lat',
        'механическое': 'mexanik', 'электронное': 'elektron', 'автоотключение': 'avtomatik o\'chish',
        'от перегрева': 'qizib ketishdan himoya'
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
    
    for(let item of itemsToImport) {
        const mapInfo = targetMappings[item.sku.toLowerCase().trim()];
        const catId = await getOrCreateCategory(mapInfo.cat);
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
            console.log(`Inserted: [${mapInfo.cat}] ${mapInfo.uz}`);
            count++;
        }
    }
    
    const remainingData = data.filter(item => !targetKeys.includes(item.sku.toLowerCase().trim()));
    fs.writeFileSync('D:/Desktop/qolgan_mahsulotlar_toza.json', JSON.stringify(remainingData, null, 2));
    
    console.log(`\nDone! Inserted ${count} items.`);
    console.log(`Removed them from qolgan_mahsulotlar_toza.json. Remaining: ${remainingData.length}`);
}

run().catch(console.error);
