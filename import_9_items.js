const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dir = 'D:/Desktop/Yangi jild/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

// SKU to Category Mapping
const targetSkus = {
    'sonifer sf-211': 'Elektr choynaklar (Tefal)',
    'sonifer sf-3055': 'Quymaq pishirgichlar',
    'uakeen zl-1503': 'Kofe mashinalari',
    'sonifer sf-8142': 'Blenderlar',
    'uakeen plisos zl-930': 'Changyutgichlar',
    'uakeen plisos zl-928': 'Changyutgichlar',
    'sonifer sf-2246': 'Changyutgichlar',
    'sonifer sf-8125': 'Mikserlar',
    'sonifer sf-1908': 'Tarozilar'
};

// Translation dictionaries
const dictParams = {
    'quvvat, vt': 'Quvvati (Vt)',
    'tarmoq simining uzunligi, m': 'Kabel uzunligi (m)',
    'balandligi, qarang': 'Balandligi (sm)',
    'kengligi, qarang': 'Kengligi (sm)',
    'chuqurlik, qarang': 'Chuqurligi (sm)',
    'og\'irligi, kg': 'Og\'irligi (kg)',
    'hajmi': 'Hajmi',
    'xamir uchun kepak': 'Xamir qolip',
    'filtr uchun rang': 'Rangi',
    'xavfsizlik': 'Xavfsizlik tizimi',
    'isitish elementi qoplamasi': 'Isitish qoplamasi',
    'dizayn xususiyatlari': 'Dizayn',
    'turi': 'Turi',
    'paket bilan o\'lchamlari, sm': 'Paket o\'lchamlari (sm)'
};

const dictValues = {
    'shnur bo\'limi': 'Kabel saqlash bo\'limi',
    'suvsiz yoqish qulfi': 'Suvsiz yoqilishdan himoya',
    'stainless steel heating element coating': 'Zanglamaydigan po\'lat',
    'kumush': 'Kumushrang',
    'bej': 'Sarg\'ish (Bej)',
    'ha': 'Mavjud',
    'color name" field.': 'Standart',
    'choynak': 'Elektr choynak',
    'uy suv osti': 'Uy sharoiti uchun'
};

function translateParam(key, val) {
    let k = String(key).toLowerCase().trim();
    let v = String(val).toLowerCase().trim();
    let resKey = dictParams[k] || key;
    let resVal = dictValues[v] || val;
    return { key: resKey, val: resVal };
}

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
    const bName = brandName.trim();
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

// Ignore list for parameters
const ignoreParams = ['sku', 'nomi', 'tavsifi', 'rasm', 'narx', 'valyuta', 'kategoriya', 'shtrix', 'brend', 'model', 'havola', 'video', 'chizilgan', 'kartaning sifati', 'to\'ldirish bo\'yicha', 'birinchi', 'barcha', 'kamida', 'bozordagi', 'csku'];

async function run() {
    let count = 0;
    
    for(const f of files) {
        const wb = xlsx.readFile(dir + f);
        const sheet = wb.Sheets["Mahsulot ma'lumotlari"];
        if(!sheet) continue;
        const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
        
        let headerRowIdx = -1;
        let skuColIdx = -1;
        for(let r=0; r<5; r++) {
            if(data[r]) {
                let idx = data[r].findIndex(c => String(c).includes('Sizning SKU *') || String(c).includes('Ваш SKU'));
                if(idx !== -1) { headerRowIdx = r; skuColIdx = idx; break; }
            }
        }
        if(headerRowIdx === -1) continue;
        const headers = data[headerRowIdx];
        
        for(let r=headerRowIdx+1; r<data.length; r++) {
            const row = data[r];
            let skuVal = row[skuColIdx] ? String(row[skuColIdx]).trim() : '';
            if(!skuVal) continue;
            
            // Match against our 9 target SKUs (exact or includes logic)
            let matchedSku = Object.keys(targetSkus).find(k => skuVal.toLowerCase().includes(k));
            if(!matchedSku) continue;
            
            console.log(`\nProcessing: ${skuVal}`);
            
            // Find fields by header
            let name_ru = ''; let desc_ru = '';
            let price = 0; let old_price = 0;
            let images = [];
            let paramsList = [];
            let weight = 0; let width = 0; let height = 0; let length = 0;
            let color = '';
            
            headers.forEach((h, colIdx) => {
                let hLower = String(h).toLowerCase();
                let v = row[colIdx] ? String(row[colIdx]).trim() : '';
                if(!v || v === 'undefined') return;
                
                if(hLower.includes('mahsulot nomi')) name_ru = v;
                if(hLower.includes('mahsulot tavsifi')) desc_ru = v;
                if(hLower.includes('narxi *')) price = parseFloat(v);
                if(hLower.includes('chizilgan narx')) old_price = parseFloat(v);
                if(v.includes('http') && (v.includes('yandex') || v.includes('uzum'))) {
                    images = v.split(',').map(s=>s.trim()).filter(Boolean);
                }
                
                if(hLower.includes('rang')) color = v;
                if(hLower.includes('vazn') || hLower.includes('og\'irlik')) weight = parseFloat(v);
                if(hLower.includes('o\'lcham')) {
                    // usually "35/25/25" (L/W/H or W/L/H)
                    let parts = v.split('/');
                    if(parts.length === 3) {
                        length = parseFloat(parts[0]) || 0;
                        width = parseFloat(parts[1]) || 0;
                        height = parseFloat(parts[2]) || 0;
                    }
                }
                
                // Collect parameters
                let isIgnore = ignoreParams.some(ig => hLower.includes(ig));
                if(!isIgnore && v.length < 50 && !hLower.includes('http') && v !== 'color name" field.') {
                    paramsList.push({ k: h, v: v });
                }
            });
            
            if(!name_ru) name_ru = skuVal;
            
            // Make pseudo Uzbek translations
            let name_uz = name_ru;
            if(name_ru.includes('Чайник')) name_uz = name_uz.replace(/Чайник\s*(электрический)?/i, 'Elektr choynak');
            if(name_ru.includes('Блинница')) name_uz = name_uz.replace(/Блинница/i, 'Quymaq pishirgich');
            if(name_ru.includes('Кофемашина')) name_uz = name_uz.replace(/Кофемашина/i, 'Kofe mashinasi');
            if(name_ru.includes('Блендер')) name_uz = name_uz.replace(/Блендер/i, 'Blender');
            if(name_ru.includes('Миксер')) name_uz = name_uz.replace(/Миксер/i, 'Mikser');
            if(name_ru.includes('Весы')) name_uz = name_uz.replace(/Весы/i, 'Tarozi');
            if(name_ru.includes('Пылесос') || name_ru.includes('Швабра')) name_uz = name_uz.replace(/Пылесос|Швабра/i, 'Changyutgich');
            
            let desc_uz = desc_ru || '';
            // Basic translation of desc (most of it will be Russian still, but we'll add the clear Uzbek parameters at the bottom)
            
            // Build parameters HTML
            let htmlParamsUz = ''; let htmlParamsRu = '';
            if(paramsList.length > 0) {
                htmlParamsUz = '<ul>';
                htmlParamsRu = '<ul>';
                paramsList.forEach(p => {
                    let trans = translateParam(p.k, p.v);
                    htmlParamsUz += `<li><strong>${trans.key}:</strong> ${trans.val}</li>`;
                    htmlParamsRu += `<li><strong>${p.k}:</strong> ${p.v}</li>`;
                });
                htmlParamsUz += '</ul>';
                htmlParamsRu += '</ul>';
                
                desc_uz += '<br><h3>Xususiyatlari</h3>' + htmlParamsUz;
                desc_ru += '<br><h3>Характеристики</h3>' + htmlParamsRu;
            }
            
            // Brand & Model
            let brandRaw = ''; let modelRaw = '';
            let bMatch = name_ru.match(/([a-zA-Z]{3,})/);
            if(bMatch) brandRaw = bMatch[1]; else brandRaw = skuVal.split(' ')[0] || 'Unknown';
            let mMatch = skuVal.match(/([A-Z0-9-]{3,})/g);
            if(mMatch && mMatch.length > 1) modelRaw = mMatch[1]; else modelRaw = skuVal.replace(brandRaw, '').trim();
            
            let barcode = `${brandRaw.toUpperCase()}-${modelRaw.toUpperCase()}`;
            
            const catId = await getOrCreateCategory(targetSkus[matchedSku]);
            const brandId = await getOrCreateBrand(brandRaw);
            
            // In a real run we would upload images to S3. Here we will just use the original Yandex URLs to save time.
            let productData = {
                id: require('crypto').randomUUID(),
                name: name_ru, // Using ru name as generic name
                name_uz: name_uz,
                name_ru: name_ru,
                description_uz: desc_uz,
                description_ru: desc_ru,
                category_id: catId,
                brand_id: brandId,
                model: modelRaw,
                barcode: barcode,
                price: price,
                old_price: old_price,
                weight: weight,
                width: width,
                height: height,
                length: length,
                color_name: color === 'color name" field.' ? '' : color,
                images: images,
                image: images[0] || null,
                sku: skuVal.toUpperCase(),
                group_id: `custom-${brandRaw}-${modelRaw}`.toLowerCase(),
                is_deleted: false,
                created_at: new Date().toISOString()
            };
            
            const { error: pErr } = await supabase.from('products').insert(productData);
            if(pErr) {
                console.error(`Error inserting ${skuVal}:`, pErr.message);
            } else {
                console.log(`Successfully inserted: ${name_uz}`);
                count++;
            }
        }
    }
    
    console.log(`\nAll done! Total inserted: ${count}`);
}

run().catch(console.error);
