const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const largeExcelPath = 'D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx';
const wb = xlsx.readFile(largeExcelPath);
const sheet = wb.Sheets["Mahsulotlar ro'yxati"];

// Fix max range so sheet_to_json works correctly for large Yandex exports
const keys = Object.keys(sheet).filter(k => k[0] !== '!');
const maxRow = Math.max(...keys.map(k => parseInt(k.replace(/\D/g, '')) || 0));
const maxCol = Math.max(...keys.map(k => xlsx.utils.decode_cell(k).c));
sheet['!ref'] = xlsx.utils.encode_range({s: {r: 0, c: 0}, e: {r: maxRow, c: maxCol}});

const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
const headers = data[1]; // row index 1

const targetSkus = {
    'uakeen zl-1503': 'Kofe mashinalari',
    'sonifer sf-8142': 'Blenderlar',
    'uakeen plisos zl-930': 'Changyutgichlar',
    'uakeen plisos zl-928': 'Changyutgichlar',
    'sonifer sf-2246': 'Changyutgichlar',
    'sonifer sf-8125': 'Mikserlar',
    'sonifer sf-1908': 'Tarozilar'
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

async function run() {
    let count = 0;
    
    for(let i=2; i<data.length; i++) {
        const row = data[i];
        if(!row) continue;
        
        let skuVal = '';
        let name_ru = ''; let desc_ru = ''; let price = 0; let old_price = 0;
        let images = [];
        
        headers.forEach((h, colIdx) => {
            let hLower = String(h).toLowerCase();
            let v = row[colIdx] ? String(row[colIdx]).trim() : '';
            if(!v || v === 'undefined') return;
            
            if(hLower === 'sizning sku *') skuVal = v;
            if(hLower === 'mahsulot nomi *') name_ru = v;
            if(hLower === 'mahsulot tavsifi *') desc_ru = v;
            if(hLower === 'narxi *') price = parseFloat(v);
            if(hLower === 'chizilgan narx') old_price = parseFloat(v);
            if(hLower === 'rasmga havola *' && v.includes('http')) {
                images = v.split(',').map(s=>s.trim()).filter(Boolean);
            }
        });
        
        if(!skuVal) continue;
        let matchedSku = Object.keys(targetSkus).find(k => skuVal.toLowerCase().includes(k));
        if(!matchedSku) continue;
        
        console.log(`Processing missing item: ${skuVal}`);
        
        let name_uz = name_ru;
        if(name_ru.includes('Кофемашина')) name_uz = name_uz.replace(/Кофемашина/i, 'Avtomatik Kofe mashinasi');
        if(name_ru.includes('Блендер')) name_uz = name_uz.replace(/Блендер/i, 'Blender');
        if(name_ru.includes('Миксер')) name_uz = name_uz.replace(/Миксер\s*(и блендер)?/i, 'Mikser');
        if(name_ru.includes('Весы')) name_uz = name_uz.replace(/Весы/i, 'Elektron Tarozi');
        if(name_ru.includes('Пылесос')) name_uz = name_uz.replace(/Пылесос/i, 'Changyutgich');
        if(name_ru.includes('запчасти к пылесосу')) name_uz = name_uz.replace(/запчасти к пылесосу/i, 'Changyutgich');
        
        let desc_uz = desc_ru || '';
        
        let brandRaw = ''; let modelRaw = '';
        let bMatch = name_ru.match(/([a-zA-Z]{3,})/);
        if(bMatch) brandRaw = bMatch[1]; else brandRaw = skuVal.split(' ')[0] || 'Unknown';
        let mMatch = skuVal.match(/([A-Z0-9-]{3,})/g);
        if(mMatch && mMatch.length > 1) modelRaw = mMatch[1]; else modelRaw = skuVal.replace(brandRaw, '').trim();
        
        let barcode = `${brandRaw.toUpperCase()}-${modelRaw.toUpperCase()}`;
        
        const catId = await getOrCreateCategory(targetSkus[matchedSku]);
        const brandId = await getOrCreateBrand(brandRaw);
        
        let productData = {
            id: require('crypto').randomUUID(),
            name: name_uz,
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
    
    console.log(`\nAll done! Total inserted: ${count}`);
}

run().catch(console.error);
