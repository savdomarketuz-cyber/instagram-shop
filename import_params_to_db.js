const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Constants
const dir = 'D:\\Desktop\\yangi mahsulotlar';
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

require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.includes('tayyor'));

  // Get categories from DB
  const { data: dbCategories, error: catErr } = await supabase.from('categories').select('id, name, name_uz');
  if (catErr) {
    console.error("Error fetching categories", catErr);
    return;
  }
  
  // Also get products to map names to UUIDs
  const { data: dbProducts, error: prodErr } = await supabase.from('products').select('id, name');
  if (prodErr) {
    console.error("Error fetching products", prodErr);
    return;
  }

  // Preload existing category params
  const { data: existingParams, error: epErr } = await supabase.from('category_params').select('*');
  if (epErr) {
      console.error("Error fetching category_params", epErr);
      return;
  }
  let categoryParamsMap = {}; // "category_id_paramName": paramObj
  existingParams.forEach(p => {
      categoryParamsMap[`${p.category_id}_${p.name.toLowerCase()}`] = p;
  });

  for (const f of files) {
    console.log(`Processing file: ${f}`);
    const wb = xlsx.readFile(path.join(dir, f));
    const sheetName = wb.SheetNames[2];
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});
    
    const excelCategoryRaw = data[0] ? data[0][0] : null;
    if (!excelCategoryRaw) {
        console.log(`Skipping ${f}: no category name found in first cell.`);
        continue;
    }
    
    let excelCategoryName = excelCategoryRaw.replace(/^Kategoriya:\s*/i, '').trim();

    // Map some known mismatches
    const categoryMap = {
        'Hair dryers': 'Fenlar',
        'Epilatorlar': 'Epilyatorlar',
        'Fotoepilatorlar': 'Epilyatorlar',
        'Soch quritgichlari-soch cho\'tkalari': 'Fen-shotkalar',
        'Hair Straighteners': 'Soch dazmollari'
    };

    if (categoryMap[excelCategoryName]) {
        excelCategoryName = categoryMap[excelCategoryName];
    }

    // Match category
    let matchedCat = dbCategories.find(c => 
        (c.name && c.name.toLowerCase() === excelCategoryName.toLowerCase()) || 
        (c.name_uz && c.name_uz.toLowerCase() === excelCategoryName.toLowerCase())
    );

    if (!matchedCat) {
        console.log(`Could not match category: ${excelCategoryName}. Trying partial match...`);
        matchedCat = dbCategories.find(c => 
            (c.name && excelCategoryName.toLowerCase().includes(c.name.toLowerCase())) ||
            (c.name_uz && excelCategoryName.toLowerCase().includes(c.name_uz.toLowerCase()))
        );
    }

    if (!matchedCat) {
        console.log(`Still could not match category: ${excelCategoryName}. Skipping file.`);
        continue;
    }
    
    console.log(`Matched excel category "${excelCategoryName}" to DB category "${matchedCat.name_uz || matchedCat.name}" (ID: ${matchedCat.id})`);

    let headerRowIndex = -1;
    for(let i=0; i<10; i++) {
      if(data[i] && data[i].includes('Mahsulot nomi *')) { headerRowIndex = i; break; }
    }
    
    if(headerRowIndex > -1) {
      const headers = data[headerRowIndex];
      const paramNames = [];
      const paramIndices = {};
      headers.forEach((h, idx) => {
        if(h && !standardCols.includes(h.trim())) {
            paramNames.push(h.trim());
            paramIndices[h.trim()] = idx;
        }
      });
      
      const nameIdx = headers.indexOf('Mahsulot nomi *');
      
      for(let i=headerRowIndex+2; i<data.length; i++) {
        const row = data[i];
        if(!row || row.length === 0 || !row[nameIdx]) continue;
        if(row[nameIdx].includes('Agar bir nechta')) continue;
        
        const productName = row[nameIdx];
        
        // Find product in DB
        const matchedProduct = dbProducts.find(p => p.name.trim().toLowerCase() === productName.trim().toLowerCase());
        
        if (matchedProduct) {
            // Process parameters for this product
            for (const paramName of paramNames) {
                const paramValue = row[paramIndices[paramName]];
                if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
                    // Check if param exists in category_params
                    const mapKey = `${matchedCat.id}_${paramName.toLowerCase()}`;
                    let dbParam = categoryParamsMap[mapKey];
                    
                    if (!dbParam) {
                        // Create param
                        const { data: newParam, error: createErr } = await supabase
                            .from('category_params')
                            .insert({
                                category_id: matchedCat.id,
                                name: paramName,
                                name_uz: paramName,
                                name_ru: paramName,
                                type: 'select',
                                predefined_values: []
                            })
                            .select()
                            .single();
                            
                        if (createErr) {
                            console.error(`Error creating param ${paramName}:`, createErr);
                            continue;
                        }
                        dbParam = newParam;
                        categoryParamsMap[mapKey] = dbParam;
                    }
                    
                    // Upsert predefined_value
                    let valStr = String(paramValue).trim();
                    if (!dbParam.predefined_values.includes(valStr)) {
                        const newPredefined = [...dbParam.predefined_values, valStr];
                        await supabase.from('category_params').update({ predefined_values: newPredefined }).eq('id', dbParam.id);
                        dbParam.predefined_values = newPredefined;
                    }

                    // Upsert product_param_values
                    await supabase
                        .from('product_param_values')
                        .upsert({
                            product_id: matchedProduct.id,
                            param_id: dbParam.id,
                            value: valStr
                        }, { onConflict: 'product_id,param_id' });
                }
            }
        }
      }
    }
  }
  console.log("Import completed!");
}

run();
