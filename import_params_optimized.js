const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

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
  'Mahsulot holatining tavsifi', 'Bozordagi SKU', 'CSKU  o?Ц\'', 'Arxivda', 'Turi',
  '"\' 󦨦󦯦榫? Ц?\'ŦЦ', 'Boshqa xususiyatlar', 'PARAM_NAMES', 'PARAM_IDS',
  'Etkazib berish opsiyasi', 'Kiritilgan', 'Batafsil uskunalar',
  'Mahsulotdagi paketlar soni, dona', 'Versiya',
  'Uzunlik, mm', 'Kengligi, mm', 'Balandligi, mm', "Og'irligi, g"
];

require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanString(s) { return s ? String(s).trim() : ''; }

async function run() {
  const files = fs.readdirSync(dir).filter(f => f.startsWith('mass_business_content') && f.endsWith('.xlsx'));

  const { data: dbCategories } = await supabase.from('categories').select('id, name, name_uz');
  const { data: dbProducts } = await supabase.from('products').select('id, name');
  const { data: existingParams } = await supabase.from('category_params').select('*');
  
  let categoryParamsMap = {}; // "catId_paramName": paramObj
  if (existingParams) {
      existingParams.forEach(p => {
          categoryParamsMap[`${p.category_id}_${p.name.toLowerCase()}`] = p;
      });
  }

  let paramValuesToUpsert = [];
  
  for (const f of files) {
    console.log(`Processing file: ${f}`);
    const wb = xlsx.readFile(path.join(dir, f));
    const sheetName = wb.SheetNames[2];
    if (!sheetName) continue;
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});
    
    let excelCategoryName = data[0] && data[0][0] ? String(data[0][0]).replace(/^Kategoriya:\s*/i, '').trim() : null;
    if (!excelCategoryName) continue;

    const categoryMap = {
        'Hair dryers': 'Fenlar',
        'Epilatorlar': 'Epilyatorlar',
        'Fotoepilatorlar': 'Epilyatorlar',
        'Soch quritgichlari-soch cho\'tkalari': 'Fen-shotkalar',
        'Hair Straighteners': 'Soch dazmollari'
    };
    excelCategoryName = categoryMap[excelCategoryName] || excelCategoryName;

    let matchedCat = dbCategories.find(c => 
        (c.name && c.name.toLowerCase() === excelCategoryName.toLowerCase()) || 
        (c.name_uz && c.name_uz.toLowerCase() === excelCategoryName.toLowerCase())
    );

    if (!matchedCat) {
        matchedCat = dbCategories.find(c => 
            (c.name && excelCategoryName.toLowerCase().includes(c.name.toLowerCase())) ||
            (c.name_uz && excelCategoryName.toLowerCase().includes(c.name_uz.toLowerCase()))
        );
    }
    if (!matchedCat) continue;
    
    console.log(`Matched category: ${matchedCat.name_uz || matchedCat.name}`);

    let headerRowIndex = -1;
    for(let i=0; i<10; i++) {
      if(data[i] && data[i].includes('Mahsulot nomi *')) { headerRowIndex = i; break; }
    }
    if(headerRowIndex === -1) continue;

    const headers = data[headerRowIndex];
    const paramNames = [];
    const paramIndices = {};
    headers.forEach((h, idx) => {
      const hClean = cleanString(h);
      if(hClean && !standardCols.includes(hClean)) {
          paramNames.push(hClean);
          paramIndices[hClean] = idx;
      }
    });
    
    const nameIdx = headers.indexOf('Mahsulot nomi *');
    if (nameIdx === -1) continue;
    
    for(let i = headerRowIndex + 2; i < data.length; i++) {
      const row = data[i];
      if(!row || row.length === 0) continue;
      const productName = cleanString(row[nameIdx]);
      if(!productName || productName.includes('Agar bir nechta')) continue;
      
      const matchedProduct = dbProducts.find(p => p.name.trim().toLowerCase() === productName.toLowerCase());
      if (!matchedProduct) continue;
      
      for (const paramName of paramNames) {
          const paramValueRaw = row[paramIndices[paramName]];
          if (paramValueRaw !== undefined && paramValueRaw !== null && String(paramValueRaw).trim() !== '') {
              const valStr = String(paramValueRaw).trim();
              const mapKey = `${matchedCat.id}_${paramName.toLowerCase()}`;
              
              let dbParam = categoryParamsMap[mapKey];
              if (!dbParam) {
                  console.log(`Creating param: ${paramName} for ${matchedCat.name_uz || matchedCat.name}`);
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
                      .select().single();
                      
                  if (createErr) {
                      console.error(`Error creating param ${paramName}:`, createErr);
                      continue;
                  }
                  dbParam = newParam;
                  categoryParamsMap[mapKey] = dbParam;
              }
              
              if (!dbParam.predefined_values.includes(valStr)) {
                  const newPredefined = [...dbParam.predefined_values, valStr];
                  await supabase.from('category_params').update({ predefined_values: newPredefined }).eq('id', dbParam.id);
                  dbParam.predefined_values = newPredefined;
              }

              paramValuesToUpsert.push({
                  product_id: matchedProduct.id,
                  param_id: dbParam.id,
                  value: valStr
              });
          }
      }
    }
  }
  
  if (paramValuesToUpsert.length > 0) {
      console.log(`Upserting ${paramValuesToUpsert.length} product parameter values in batches...`);
      const BATCH_SIZE = 500;
      for (let i = 0; i < paramValuesToUpsert.length; i += BATCH_SIZE) {
          const batch = paramValuesToUpsert.slice(i, i + BATCH_SIZE);
          const { error: upsertErr } = await supabase
              .from('product_param_values')
              .upsert(batch, { onConflict: 'product_id,param_id' });
              
          if (upsertErr) {
              console.error(`Error upserting batch ${i}:`, upsertErr);
          } else {
              console.log(`Batch ${i / BATCH_SIZE + 1} completed.`);
          }
      }
  }
  
  console.log("Import completely finished!");
}

run();
