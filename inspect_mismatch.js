const xlsx = require('xlsx'); 
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');
  let excelSkus = [];
  
  for(let s=0; s<wb.SheetNames.length; s++) {
      const d = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[s]], {header: 1});
      const hr = d.find(r => r && r.some(c => String(c).includes('Sizning SKU')));
      if(hr) {
          const skuIdx = hr.findIndex(c => String(c).includes('Sizning SKU'));
          d.forEach((row, i) => { if(i>1 && row[skuIdx]) excelSkus.push(String(row[skuIdx]).trim()); });
          break;
      }
  }
  
  const { data: products } = await supabase.from('products').select('id, model, barcode, name').like('group_id', 'bulk-%');
  
  console.log('--- Sample Excel SKUs ---');
  console.log(excelSkus.slice(0, 10));
  
  console.log('--- Sample DB Models/Barcodes ---');
  console.log(products.slice(0, 10).map(p => ({ model: p.model, barcode: p.barcode })));
}
inspect();
