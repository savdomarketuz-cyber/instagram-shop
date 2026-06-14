const xlsx = require('xlsx'); 
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyze() {
  const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');
  const sheet = wb.Sheets["Mahsulotlar ro'yxati"];
  
  // Fix the broken !ref in this Excel file so xlsx can read it
  const keys = Object.keys(sheet).filter(k => k[0] !== '!');
  const maxRow = Math.max(...keys.map(k => parseInt(k.replace(/\D/g, '')) || 0));
  const maxCol = Math.max(...keys.map(k => xlsx.utils.decode_cell(k).c));
  sheet['!ref'] = xlsx.utils.encode_range({s: {r: 0, c: 0}, e: {r: maxRow, c: maxCol}});
  
  const d = xlsx.utils.sheet_to_json(sheet, {header: 1});
  
  const hr = d[1]; // Row 1 is header
  const skuIdx = hr.indexOf('Sizning SKU *');
  const catIdx = hr.indexOf('Bozordagi kategoriya');
  
  // Build lookup map: SKU -> Category
  const skuMap = {};
  d.forEach((row, i) => {
     if(i < 3 || !row[skuIdx]) return;
     const sku = String(row[skuIdx]).trim();
     const cat = String(row[catIdx] || '').trim();
     if(sku) skuMap[sku] = cat;
  });
  
  // Read current bulk products from DB
  const { data: products } = await supabase.from('products').select('id, model, barcode, name').like('group_id', 'bulk-%');
  
  let mappedCount = 0;
  let unmappedCount = 0;
  let duplicates = 0;
  let skuSeen = new Set();
  
  const results = [];
  
  products.forEach(p => {
     // DB saves SKU as barcode, which we formulated as BRAND-MODEL. 
     // We need to match with the Excel SKU. Let's try exact matches first, then substrings.
     const possibleSkus = [p.barcode, p.model, p.name.split(' ')[0]];
     
     let realCat = null;
     let matchedSku = null;
     
     for(let ps of possibleSkus) {
         if(!ps) continue;
         if(skuMap[ps]) { realCat = skuMap[ps]; matchedSku = ps; break; }
     }
     
     if(!realCat) {
         // Substring matching
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
             duplicates++;
             results.push({ sku: matchedSku, status: 'DUPLICATE', name: p.name });
             return;
         }
         skuSeen.add(matchedSku);
     }
     
     if(realCat) {
         mappedCount++;
         results.push({ sku: matchedSku, status: 'MAPPED', cat: realCat, name: p.name });
     } else {
         unmappedCount++;
         results.push({ sku: p.model, status: 'UNMAPPED', name: p.name });
     }
  });
  
  console.log(`Total Excel SKUs Available: ${Object.keys(skuMap).length}`);
  console.log(`Total DB Products: ${products.length}`);
  console.log(`Duplicates Filtered: ${duplicates}`);
  console.log(`Successfully Mapped Categories: ${mappedCount}`);
  console.log(`Unmapped Categories: ${unmappedCount}`);
  
  const uniqueCats = [...new Set(results.filter(r=>r.cat).map(r=>r.cat))];
  console.log(`Unique Categories that we can assign:`);
  console.log(uniqueCats);
}
analyze();
