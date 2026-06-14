const xlsx = require('xlsx'); 
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const groupId = 'babyverse-se-series-group';

async function fixProducts() {
  // 1. Create or get Babyverse brand
  let brandId = null;
  const { data: bData } = await supabase.from('brands').select('id').ilike('name', 'Babyverse').single();
  if (bData) {
     brandId = bData.id;
  } else {
     const newId = crypto.randomUUID();
     const { data: newBrand, error: bErr } = await supabase.from('brands').insert({id: newId, name: 'Babyverse'}).select('id').single();
     if(bErr) throw bErr;
     brandId = newBrand.id;
  }
  console.log('Brand ID:', brandId);

  // 2. Read excel to get barcodes and params
  const wb = xlsx.readFile('D:/Desktop/yangi mahsulotlar/mahsulotlar_export_2026-06-08_params_columns.xlsx'); 
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1}); 

  // 3. Get the products we just inserted
  const { data: products } = await supabase.from('products').select('id, model').eq('group_id', groupId);
  
  // Create mapping of category_params we need
  const paramNames = [
     { name: "Qo'shimcha qismlar", name_ru: "Вложения" },
     { name: "Lampa turi", name_ru: "Тип лампы" },
     { name: "Rejimlar", name_ru: "Режимы" },
     { name: "Lazer resursi", name_ru: "Ресурс вспышек" },
     { name: "Intensivlik darajalari", name_ru: "Уровни интенсивности" },
     { name: "Qo'shimcha funktsiyalar", name_ru: "Доп. функции" }
  ];
  
  const catParamsMap = {};
  for(let p of paramNames) {
      // Check if exists
      let { data: cp } = await supabase.from('category_params').select('id').eq('category_id', 401).ilike('name_uz', '%' + p.name + '%').limit(1);
      if(cp && cp.length > 0) {
         catParamsMap[p.name] = cp[0].id;
      } else {
         // insert
         const { data: ncp } = await supabase.from('category_params').insert({
            category_id: 401,
            name: p.name,
            name_uz: p.name,
            name_ru: p.name_ru,
            type: 'text',
            predefined_values: []
         }).select('id').single();
         catParamsMap[p.name] = ncp.id;
      }
  }

  // 4. Update products & insert product_params
  for(let p of products) {
      // Find row in excel
      const row = data.find(r => r[8] === p.model);
      if(!row) continue;
      
      const barcode = row[4] || `BABYVERSE-${p.model}`;
      
      // Update brand and barcode
      await supabase.from('products').update({ brand_id: brandId, barcode: barcode }).eq('id', p.id);
      
      // Insert product_params
      const paramsToInsert = [];
      const excelParams = [
         { name: "Qo'shimcha qismlar", val: row[29] },
         { name: "Lampa turi", val: row[30] },
         { name: "Rejimlar", val: row[31] },
         { name: "Lazer resursi", val: row[32] },
         { name: "Intensivlik darajalari", val: row[33] },
         { name: "Qo'shimcha funktsiyalar", val: row[34] }
      ];
      
      for(let ep of excelParams) {
          if(ep.val && ep.val !== '-' && ep.val.trim() !== '') {
             paramsToInsert.push({
                 product_id: p.id,
                 param_id: catParamsMap[ep.name],
                 value: String(ep.val)
             });
          }
      }
      
      if(paramsToInsert.length > 0) {
          await supabase.from('product_params').insert(paramsToInsert);
      }
  }
  
  console.log('Successfully updated brand, barcode, and inserted formal product params!');
}
fixProducts().catch(console.error);
