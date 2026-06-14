const xlsx = require('xlsx'); 
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const wb = xlsx.readFile('D:/Desktop/yangi mahsulotlar/mahsulotlar_export_2026-06-08_params_columns.xlsx'); 
const sheetName = wb.SheetNames[0]; 
const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1}); 

const groupId = 'babyverse-se-series-group';

async function importProducts() {
  const productsToInsert = [];
  
  for(let i=1; i<data.length; i++) {
    const row = data[i];
    if(!row[10]) continue; // skip empty rows
    
    // Parse params
    const vlojeniya = row[29] || '-';
    const lampa = row[30] || '-';
    const rejim = row[31] || '-';
    const resurs = row[32] || '-';
    const intensivlik = row[33] || '-';
    const qoshimcha = row[34] || '-';
    
    const paramsUzHtml = `
<br><br><b>Texnik xususiyatlari:</b>
<ul>
<li><b>Qo'shimcha qismlar:</b> ${vlojeniya}</li>
<li><b>Lampa turi:</b> ${lampa}</li>
<li><b>Rejimlar:</b> ${rejim}</li>
<li><b>Chaqnashlar resursi:</b> ${resurs}</li>
<li><b>Intensivlik darajalari:</b> ${intensivlik}</li>
<li><b>Qo'shimcha funksiyalar:</b> ${qoshimcha}</li>
</ul>`;

    const paramsRuHtml = `
<br><br><b>Характеристики:</b>
<ul>
<li><b>Вложения:</b> ${vlojeniya}</li>
<li><b>Тип лампы:</b> ${lampa}</li>
<li><b>Режимы:</b> ${rejim}</li>
<li><b>Ресурс вспышек:</b> ${resurs}</li>
<li><b>Уровни интенсивности:</b> ${intensivlik}</li>
<li><b>Доп. функции:</b> ${qoshimcha}</li>
</ul>`;

    const rawImages = row[17] ? row[17].split(';').filter(x => x.trim() !== '') : [];
    const mainImage = rawImages.length > 0 ? rawImages[0] : null;

    let descUz = (row[20] || '') + paramsUzHtml;
    let descRu = (row[22] || '') + paramsRuHtml;

    productsToInsert.push({
      id: crypto.randomUUID(),
      name: row[10],
      name_ru: row[11],
      model: row[8],
      sku: row[2] || `BV-${row[8]}`,
      price: row[12] || 0,
      old_price: row[13] || 0,
      cost_price: row[14] || 0,
      category_id: 401,
      image: mainImage,
      images: rawImages,
      description_uz: descUz,
      description_ru: descRu,
      description: descUz,
      length: row[23] || 0,
      width: row[24] || 0,
      height: row[25] || 0,
      weight: row[26] || 0,
      group_id: groupId,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  console.log(`Prepared ${productsToInsert.length} products to insert.`);
  
  const { data: inserted, error } = await supabase.from('products').insert(productsToInsert);
  
  if(error) {
     console.error('Error inserting products:', error);
  } else {
     console.log('Successfully inserted into DB!');
  }
}

importProducts();
