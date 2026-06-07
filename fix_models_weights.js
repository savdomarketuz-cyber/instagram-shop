const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    const { data: products } = await supabase.from('products').select('id, sku, name, weight, model');
    let count = 0;
    for (const p of products) {
        let update = {};
        
        // 1. Fix weight
        if (p.weight) {
            let w = parseFloat(p.weight);
            if (!isNaN(w) && w > 0 && w < 100) {
                update.weight = String(Math.round(w * 1000));
            }
        }
        
        // 2. Fix model
        let sku = p.sku;
        if (sku) {
            // Strip brands
            const brands = ['MAC STYLER', 'MAC', 'BOSCH', 'VGR', 'UAKEEN', 'PHILLIPS', 'REMIOGTON', 'BABYVERSE', 'ENZO', 'CRONIER', 'ZUMBA', 'JRM', 'BRAUN', 'KEMEI', 'IPARAH', 'LAZER PHILIPS LUMEA', 'LAZER PHILIPS', 'IBORRA LAZER', 'PROMOZER PLOYKA', 'MAX', 'FEN PHILLIPS', 'FEN VGR', 'FEN'];
            let modelStr = sku;
            for (const b of brands) {
                if (modelStr.toUpperCase().startsWith(b + ' ')) {
                    modelStr = modelStr.substring(b.length + 1).trim();
                    break;
                } else if (modelStr.toUpperCase().startsWith(b + '-')) {
                    modelStr = modelStr.substring(b.length + 1).trim();
                    break;
                } else if (modelStr.toUpperCase().startsWith(b + '/')) {
                    modelStr = modelStr.substring(b.length + 1).trim();
                    break;
                }
            }
            
            // Strip trailing colors
            const colors = ['BLACK+RED', 'QORA-KOK', 'QORA', 'QIZIL', 'KOK', "KO'K", 'PINK', 'GREEN', 'YELLOW', 'BLUE', 'BEIGE', 'TIFFANY', 'SMALL', 'RED', 'SKY BLUE', 'WHITE', 'BLACK'];
            for (const c of colors) {
                if (modelStr.toUpperCase().endsWith(' ' + c)) {
                    modelStr = modelStr.substring(0, modelStr.length - c.length - 1).trim();
                    break;
                } else if (modelStr.toUpperCase().endsWith('-' + c)) {
                    modelStr = modelStr.substring(0, modelStr.length - c.length - 1).trim();
                    break;
                } else if (modelStr.toUpperCase().endsWith('/' + c)) {
                    modelStr = modelStr.substring(0, modelStr.length - c.length - 1).trim();
                    break;
                }
            }
            
            if (!modelStr) {
                 if (sku.toUpperCase().includes('JRM PINK')) modelStr = 'JRM';
                 else if (sku.toUpperCase().includes('IBORRA LAZER')) modelStr = 'IBORRA LAZER';
                 else if (sku.toUpperCase().includes('PROMOZER PLOYKA 5')) modelStr = 'PLOYKA 5';
                 else modelStr = sku;
            }
            
            if (modelStr && modelStr !== p.model) {
                update.model = modelStr;
            }
        }
        
        if (Object.keys(update).length > 0) {
            const { error } = await supabase.from('products').update(update).eq('id', p.id);
            if(error) console.error(error);
            else {
                console.log('Fixed', p.sku, '-> Model:', update.model || p.model, '| Weight:', update.weight || p.weight);
                count++;
            }
        }
    }
    console.log('Total fixed:', count);
}
fix();
