const xlsx = require('xlsx'); 
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMapping() {
  console.log('1. Reading Assortment Excel...');
  const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');
  const sheet = wb.Sheets["Mahsulotlar ro'yxati"];
  
  const keys = Object.keys(sheet).filter(k => k[0] !== '!');
  const maxRow = Math.max(...keys.map(k => parseInt(k.replace(/\D/g, '')) || 0));
  const maxCol = Math.max(...keys.map(k => xlsx.utils.decode_cell(k).c));
  sheet['!ref'] = xlsx.utils.encode_range({s: {r: 0, c: 0}, e: {r: maxRow, c: maxCol}});
  
  const d = xlsx.utils.sheet_to_json(sheet, {header: 1});
  const hr = d[1]; 
  const skuIdx = hr.indexOf('Sizning SKU *');
  const catIdx = hr.indexOf('Bozordagi kategoriya');
  
  const skuMap = {};
  d.forEach((row, i) => {
     if(i < 3 || !row[skuIdx]) return;
     const sku = String(row[skuIdx]).trim();
     const cat = String(row[catIdx] || '').trim();
     if(sku) skuMap[sku] = cat;
  });

  console.log('2. Fetching DB Products...');
  const { data: products } = await supabase.from('products').select('*').like('group_id', 'bulk-%');
  
  const duplicateIds = [];
  const mappedProducts = [];
  const unmappedProducts = [];
  let skuSeen = new Set();
  
  products.forEach(p => {
     const possibleSkus = [p.barcode, p.model, p.name.split(' ')[0]];
     let realCat = null;
     let matchedSku = null;
     
     for(let ps of possibleSkus) {
         if(!ps) continue;
         if(skuMap[ps]) { realCat = skuMap[ps]; matchedSku = ps; break; }
     }
     
     if(!realCat) {
         for(let xlSku in skuMap) {
             if(p.name.includes(xlSku) || xlSku.includes(p.model)) {
                 realCat = skuMap[xlSku];
                 matchedSku = xlSku;
                 break;
             }
         }
     }
     
     if(matchedSku) {
         if(skuSeen.has(matchedSku)) {
             duplicateIds.push(p.id);
             return;
         }
         skuSeen.add(matchedSku);
     }
     
     if(realCat) {
         mappedProducts.push({ p, realCat });
     } else {
         unmappedProducts.push({ p });
     }
  });

  console.log(`Duplicates to delete: ${duplicateIds.length}`);
  if(duplicateIds.length > 0) {
      await supabase.from('products').delete().in('id', duplicateIds);
      console.log('Deleted duplicates!');
  }
  
  console.log('3. Creating Categories...');
  const uniqueCats = [...new Set(mappedProducts.map(m => m.realCat))];
  const catIdMap = {};
  
  // Ensure we have Elektronika parent
  const { data: parentData } = await supabase.from('categories').select('id').eq('name', 'Elektronika').single();
  const parentId = parentData ? parentData.id : '1';
  
  // Fetch existing categories to avoid recreating
  const { data: existCats } = await supabase.from('categories').select('id, name');
  const existCatMap = {};
  existCats.forEach(c => existCatMap[c.name] = c.id);
  
  for(let catName of uniqueCats) {
      if(existCatMap[catName]) {
          catIdMap[catName] = existCatMap[catName];
      } else {
          // generate slug
          let slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          if(slug.length > 50) slug = slug.substring(0, 50);
          slug = slug + '-' + Math.random().toString(36).substr(2, 4);
          
          const id = require('crypto').randomUUID();
          const { data: newCat, error } = await supabase.from('categories').insert({
             id: id,
             name: catName,
             name_ru: catName,
             name_uz: catName,
             parent_id: parentId
          }).select('id').single();
          
          if(newCat) {
              catIdMap[catName] = newCat.id;
          } else {
              console.log('Cat Create Error:', error);
          }
      }
  }
  
  console.log('4. Assigning Mapped Products...');
  for(let m of mappedProducts) {
      const cId = catIdMap[m.realCat];
      if(cId) await supabase.from('products').update({ category_id: cId }).eq('id', m.p.id);
  }
  
  console.log('5. Heuristic Mapping for Remaining Products...');
  // Extract keywords from categories to map the unmapped
  const catKeywordsMap = {};
  for(let cName of uniqueCats) {
      const words = cName.toLowerCase().split(/[\s/,-]+/).filter(w => w.length > 3);
      catKeywordsMap[cName] = words;
  }
  
  for(let m of unmappedProducts) {
      const nameWords = m.p.name.toLowerCase().split(/[\s/,-]+/).filter(w => w.length > 3);
      let bestCat = null;
      let maxScore = 0;
      
      for(let cName of uniqueCats) {
          let score = 0;
          const kWords = catKeywordsMap[cName];
          for(let nw of nameWords) {
              if(kWords.includes(nw)) score += 2;
              // partial match
              else if (kWords.some(kw => kw.includes(nw) || nw.includes(kw))) score += 1;
          }
          if(score > maxScore) {
              maxScore = score;
              bestCat = cName;
          }
      }
      
      if(bestCat && maxScore > 0) {
          const cId = catIdMap[bestCat];
          if(cId) await supabase.from('products').update({ category_id: cId }).eq('id', m.p.id);
      } else {
          // fallback to first general category or do nothing
      }
  }
  
  console.log('All Done!');
}
applyMapping().catch(console.error);
