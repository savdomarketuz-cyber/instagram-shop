const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const correctMappings = {
  'SONIFER SF-2079': { brand: 'Sonifer', model: 'SF-2079' },
  'BLENDER SAMSUNG': { brand: 'Samsung', model: 'Blender 5-speed' },
  'SONIFER SF-3602': { brand: 'Sonifer', model: 'SF-3602' },
  'BLENDER BOSCH': { brand: 'Bosch', model: 'Blender 5-speed' },
  'SONIFER SF-8006': { brand: 'Sonifer', model: 'SF-8006' },
  'SONIFER SF-2072 RED': { brand: 'Sonifer', model: 'SF-2072' },
  'SONIFER SF-8187': { brand: 'Sonifer', model: 'SF-8187' },
  'BLENDER LG SVET': { brand: 'LG', model: 'Blender 5-speed' },
  'SONIFER SF-2025 BLUE': { brand: 'Sonifer', model: 'SF-2025' },
  'SONIFER SF-3567': { brand: 'Sonifer', model: 'SF-3567' },
  'KOMBAYN 4IN1 BOSCH': { brand: 'Bosch', model: 'Kombayn 4-in-1' },
  'CHOPPER BOSCH BS-888': { brand: 'Bosch', model: 'BS-888' },
  'SONIFER SF-2035': { brand: 'Sonifer', model: 'SF-2035' },
  'SF-2025 WHITE': { brand: 'Sonifer', model: 'SF-2025' },
  'SONIFER SF-3583': { brand: 'Sonifer', model: 'SF-3583' },
  'KOFEMOLKA SONIFER SF-3507': { brand: 'Sonifer', model: 'SF-3507' },
  'SONIFER SF-2072 BLACK': { brand: 'Sonifer', model: 'SF-2072' },
  'CHOPPER SONIFER SF-8123': { brand: 'Sonifer', model: 'SF-8123' },
  'SONIFER SF-2025 RED': { brand: 'Sonifer', model: 'SF-2025' }
};

async function getOrCreateBrand(brandName) {
    const { data: exist } = await supabase.from('brands').select('id').ilike('name', brandName).limit(1);
    if(exist && exist.length > 0) return exist[0].id;
    
    const { data, error } = await supabase.from('brands').insert({
        id: require('crypto').randomUUID(),
        name: brandName
    }).select('id').single();
    if(error) throw error;
    return data.id;
}

async function run() {
  for(let [sku, info] of Object.entries(correctMappings)) {
    const brandId = await getOrCreateBrand(info.brand);
    
    const { data: product } = await supabase.from('products').select('id').eq('sku', sku).single();
    if(product) {
      const barcode = `${info.brand.toUpperCase()}-${info.model.toUpperCase()}`;
      const group_id = `custom-${info.brand.toLowerCase()}-${info.model.toLowerCase()}`;
      
      const { error } = await supabase.from('products').update({
        brand_id: brandId,
        model: info.model,
        barcode: barcode,
        group_id: group_id
      }).eq('id', product.id);
      
      if(error) console.error(`Error updating ${sku}:`, error.message);
      else console.log(`Fixed ${sku} => Brand: ${info.brand}, Model: ${info.model}`);
    } else {
      console.log(`Product ${sku} not found!`);
    }
  }
}

run().catch(console.error);
