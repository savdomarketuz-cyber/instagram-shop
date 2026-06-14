const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MODE = process.argv[2] === 'execute' ? 'execute' : 'dry-run';

const dir = 'D:\\Desktop\\Yangi jild';
const standardCols = [
  'Sizning SKU *', 'Muhim xatolar', "Tanqidiy bo'lmagan xatolar", 'Kartaning sifati',
  "To'ldirish bo'yicha tavsiyalar", 'Variantlar guruhining nomi', 'Mahsulot nomi *',
  'Rasmga havola *', 'Eskiz uchun rasm', 'Mahsulot tavsifi *', 'Brend *', 'Shtrixkod *',
  'Teglar', 'Video havolasi', 'Narxi *', 'Chizilgan narx', 'Narxi', "Ko'rsatmalar",
  'Ishlab chiqarilgan mamlakat', 'Ishlab chiqaruvchining maqolasi', 'Ishlab chiqaruvchi',
  'Paket bilan vazn, kg', "Paket bilan o'lchamlari, sm", 'Mahsulot bir nechta joyni egallaydi',
  "Qo'shimcha xarajatlar", 'Yaroqlilik muddati', 'Yaroqlilik muddati haqida sharh',
  'Xizmat muddati', 'Xizmat muddati haqida sharh', 'Kafolat muddati', 'Kafolat muddati haqida sharh',
  'Mahsulot uchun hujjat raqami', 'Tn VED kodi', 'Belgilash turi', "Mahsulot ko'rinishi",
  'Mahsulot holatining tavsifi', 'Bozordagi SKU', 'CSKU на Маркете', 'Arxivda', 'Turi',
  'Дата дополнения карточки', 'Boshqa xususiyatlar', 'PARAM_NAMES', 'PARAM_IDS',
  'Etkazib berish opsiyasi', 'Kiritilgan', 'Batafsil uskunalar',
  'Mahsulotdagi paketlar soni, dona', 'Versiya',
  'Uzunlik, mm', 'Kengligi, mm', 'Balandligi, mm', "Og'irligi, g"
];

// Target category mapping
const mappings = [
    {
        file: 'mass_business_content_template_216615303_09-06-2026(10).xlsx',
        dbCategoryId: '501',
        name: 'Blenderlar (Statsionar)'
    },
    {
        file: 'mass_business_content_template_216615303_09-06-2026(20).xlsx',
        dbCategoryId: '501',
        name: 'Blenderlar (Portativ)'
    },
    {
        file: 'mass_business_content_template_216615303_09-06-2026.xlsx',
        dbCategoryId: '17809901663251',
        name: 'Qo\'l blenderlari'
    }
];

// Helper to translate materials to Uzbek
function translateMaterial(mat) {
    if (!mat) return null;
    let m = String(mat).toLowerCase().trim();
    if (m.includes('glass') && m.includes('plastic')) return 'Shisha va plastik';
    if (m.includes('стекло') && m.includes('пластик')) return 'Shisha va plastik';
    if (m.includes('glass') || m.includes('стекло')) return 'Shisha';
    if (m.includes('plastic') || m.includes('пластик')) return 'Plastik';
    if (m.includes('stainless steel') || m.includes('нержавеющая сталь')) return 'Zanglamaydigan po\'lat';
    if (m.includes('metal') || m.includes('металл')) return 'Metall';
    if (m.includes('steel') || m.includes('сталь')) return 'Po\'lat';
    return mat;
}

// Strictly clean Tezlik soni
function cleanTezlik(val) {
    if (!val) return null;
    const s = String(val).toLowerCase().trim();
    if (s === 'есть' || s === 'yes' || s === 'true' || s === 'not specified' || s === 'speed control' || s === 'speed' || s === 'no' || s === 'false' || s === 'есть скорость') {
        return null;
    }
    
    const numMatch = s.match(/^(\d+)/);
    if (numMatch) {
        return numMatch[1];
    }
    
    if (s.includes('multi-speed') || s.includes('multi') || s.includes('ko\'p') || s.includes('много')) {
        return "Ko'p tezlikli";
    }
    
    return null;
}

// Clean and translate Russian/English parameter texts to Uzbek
function translateToUzbek(val) {
    if (!val) return null;
    if (typeof val !== 'string') return val;
    
    let str = val;
    
    const replacements = [
        { rx: /3в1/g, rep: "3 tasi 1 da" },
        { rx: /4в1/g, rep: "4 tasi 1 da" },
        { rx: /5в1/g, rep: "5 tasi 1 da" },
        { rx: /3 in 1/ig, rep: "3 tasi 1 da" },
        { rx: /4 in 1/ig, rep: "4 tasi 1 da" },
        { rx: /5 in 1/ig, rep: "5 tasi 1 da" },
        
        { rx: /Смузи/g, rep: "Smuzi" },
        { rx: /Кофе/g, rep: "Kofe" },
        { rx: /Измельчение/g, rep: "Maydalash" },
        { rx: /измельчитель/g, rep: "maydalagich" },
        { rx: /кофемолка/g, rep: "kofe maydalagich" },
        { rx: /блендер/g, rep: "blender" },
        
        { rx: /Смузи, коктейли, соусы, пюре/g, rep: "Smuzi, kokteyllar, souslar, pyure" },
        { rx: /Замешивание теста/g, rep: "Xamir qorishtirish" },
        { rx: /Дробление льда, зерен, орехов/g, rep: "Muz, donlar, yong'oqlarni maydalash" },
        { rx: /Измельчение овощей, фруктов/g, rep: "Sabzavot va mevalarni maydalash" },
        
        { rx: /стационарный блендер/ig, rep: "statsionar blender" },
        { rx: /погружной блендер/ig, rep: "qo'l blenderi" },
        { rx: /ручной/ig, rep: "qo'l" },
        
        { rx: /титановые/ig, rep: "titanli" },
        { rx: /титан/ig, rep: "titan" },
        { rx: /нержавеющая сталь/ig, rep: "zanglamaydigan po'lat" },
        { rx: /закаленное стекло/ig, rep: "bardoshli shisha" },
        { rx: /стекло/ig, rep: "shisha" },
        { rx: /пластик/ig, rep: "plastik" },
        { rx: /металл/ig, rep: "metall" },
        
        { rx: /есть/ig, rep: "bor" },
        { rx: /нет/ig, rep: "yo'q" },
        
        { rx: /гарантия/ig, rep: "kafolat" },
        { rx: /год/ig, rep: "yil" },
        { rx: /лет/ig, rep: "yil" },
        
        { rx: /литра|литр|литра|л/g, rep: "l" },
        { rx: /liters|liter|l/g, rep: "l" },
        { rx: /мл|мl/ig, rep: "ml" },
        { rx: /MAX/g, rep: "maks" }
    ];
    
    replacements.forEach(r => {
        str = str.replace(r.rx, r.rep);
    });
    
    return str.replace(/\s+/g, ' ').trim();
}

async function run() {
    console.log(`=== Blender Parameters Import (${MODE.toUpperCase()} Mode) ===\n`);
    
    // Fetch active products in DB
    const { data: dbProducts, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_uz, sku')
        .eq('is_deleted', false);
        
    if (prodError) {
        console.error("Error fetching products:", prodError);
        return;
    }
    
    console.log(`Loaded ${dbProducts.length} active products from database for mapping.\n`);
    
    for (const mapping of mappings) {
        const filePath = path.join(dir, mapping.file);
        if (!fs.existsSync(filePath)) {
            console.log(`Skipping: File not found ${mapping.file}`);
            continue;
        }
        
        console.log(`Analyzing file: ${mapping.file} for Category ID: ${mapping.dbCategoryId} (${mapping.name})...`);
        const wb = xlsx.readFile(filePath);
        const sheetName = wb.SheetNames[2];
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
        
        let headerRowIndex = -1;
        for(let i=0; i<10; i++) {
            if(data[i] && data[i].includes('Mahsulot nomi *')) { 
                headerRowIndex = i; 
                break; 
            }
        }
        
        if (headerRowIndex === -1) {
            console.log(`  Could not find header row in ${mapping.file}. Skipping.`);
            continue;
        }
        
        const headers = data[headerRowIndex];
        const paramNames = [];
        const paramIndices = {};
        
        headers.forEach((h, idx) => {
            if (h && !standardCols.includes(h.trim())) {
                const cleanName = h.trim();
                paramNames.push(cleanName);
                paramIndices[cleanName] = idx;
            }
        });
        
        console.log(`  Found ${paramNames.length} custom parameters in Excel.`);
        
        const nameIdx = headers.indexOf('Mahsulot nomi *');
        const skuIdx = headers.indexOf('Sizning SKU *');
        
        const rowsToProcess = [];
        for(let i = headerRowIndex + 2; i < data.length; i++) {
            const row = data[i];
            if(!row || row.length === 0 || !row[nameIdx]) continue;
            if(row[nameIdx].includes('Agar bir nechta') || row[nameIdx].includes('Sxemaga e\'tibor')) continue;
            
            const excelName = row[nameIdx].trim();
            const excelSku = row[skuIdx] ? row[skuIdx].trim() : '';
            
            // Match with DB product by SKU (case-insensitive) or name
            let dbProduct = dbProducts.find(p => p.sku && p.sku.trim().toUpperCase() === excelSku.toUpperCase());
            if (!dbProduct) {
                dbProduct = dbProducts.find(p => p.name && p.name.trim().toLowerCase() === excelName.toLowerCase());
            }
            
            if (dbProduct) {
                rowsToProcess.push({
                    dbProduct,
                    row
                });
            }
        }
        
        console.log(`  Matched ${rowsToProcess.length} products in database to rows in this sheet.`);
        
        if (MODE === 'dry-run') {
            console.log(`  [DRY RUN] Would create/verify parameters and link values for ${rowsToProcess.length} products.`);
            continue;
        }
        
        // Execute Import
        console.log(`  Inserting parameters into category_params...`);
        const categoryParamsMap = {};
        
        for (const paramName of paramNames) {
            // Check if parameter already exists in database
            const { data: existing, error: checkErr } = await supabase
                .from('category_params')
                .select('*')
                .eq('category_id', mapping.dbCategoryId)
                .eq('name', paramName);
                
            let dbParam;
            if (checkErr || !existing || existing.length === 0) {
                // Insert new parameter
                const { data: newParam, error: insErr } = await supabase
                    .from('category_params')
                    .insert({
                        category_id: mapping.dbCategoryId,
                        name: paramName,
                        name_uz: paramName,
                        name_ru: paramName,
                        type: 'select',
                        predefined_values: []
                    })
                    .select()
                    .single();
                    
                if (insErr) {
                    console.error(`    Error inserting param "${paramName}":`, insErr.message);
                    continue;
                }
                dbParam = newParam;
                console.log(`    Created parameter: "${paramName}"`);
            } else {
                dbParam = existing[0];
            }
            
            categoryParamsMap[paramName] = dbParam;
        }
        
        console.log(`  Importing product parameter values...`);
        let valueCount = 0;
        
        for (const item of rowsToProcess) {
            const { dbProduct, row } = item;
            for (const paramName of paramNames) {
                let excelValue = row[paramIndices[paramName]];
                if (excelValue !== undefined && excelValue !== null && excelValue !== '') {
                    let cleanValue = String(excelValue).trim();
                    
                    // Clean Tezlik soni
                    if (paramName === 'Tezlik soni') {
                        const cleaned = cleanTezlik(cleanValue);
                        if (cleaned === null) continue; // Skip saving if invalid
                        cleanValue = cleaned;
                    }
                    
                    // Clean Power
                    if (paramName === 'Quvvat, Vt') {
                        cleanValue = cleanValue.replace(/\b(\d+)\s*(w|watt|watts|vt|вт|в)\b/ig, '$1 Vt').trim();
                    }
                    
                    // Clean Materials
                    if (paramName === 'Piyola materiali' || paramName === 'Material immersion qism' || paramName === 'Korpus materiali') {
                        cleanValue = translateMaterial(cleanValue);
                    }
                    
                    // Clean Warranty
                    if (paramName === 'Qo\'shimcha ma\'lumot') {
                        cleanValue = cleanValue
                            .replace(/\b(\d+)\s*(year|years|года|лет|год)\b/ig, '$1 yil kafolat')
                            .replace(/\b(\d+)\s*(months|месяцев|месяца|месяц)\b/ig, '$1 oy kafolat')
                            .trim();
                    }
                    
                    // General translation
                    cleanValue = translateToUzbek(cleanValue);
                    
                    const dbParam = categoryParamsMap[paramName];
                    if (!dbParam) continue;
                    
                    // Update predefined values in parameter if new
                    if (!dbParam.predefined_values.includes(cleanValue)) {
                        dbParam.predefined_values.push(cleanValue);
                        await supabase
                            .from('category_params')
                            .update({ predefined_values: dbParam.predefined_values })
                            .eq('id', dbParam.id);
                    }
                    
                    // Upsert product param value
                    const { error: upsertErr } = await supabase
                        .from('product_param_values')
                        .upsert({
                            product_id: dbProduct.id,
                            param_id: dbParam.id,
                            value: cleanValue
                        }, { onConflict: 'product_id,param_id' });
                        
                    if (upsertErr) {
                        console.error(`    Error upserting value for ${dbProduct.sku}:`, upsertErr.message);
                    } else {
                        valueCount++;
                    }
                }
            }
        }
        
        console.log(`  Completed category "${mapping.name}". Imported/verified ${valueCount} parameter values.\n`);
    }
    
    console.log("Database parameters import process complete!");
}

run().catch(console.error);
