const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(str) {
    if (!str) return '';
    return String(str).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function updateCosts() {
    const wb = xlsx.readFile('D:\\Desktop\\velari narx\\extracted_products.xlsx');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Create a map of normalized model -> cost info
    const costMap = {};
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue;
        
        const model = normalize(row[1]);
        const costUZS = row[3] ? Number(row[3]) : null;
        const commSeller = row[6] ? Number(row[6]) : null;
        const commManager = row[7] ? Number(row[7]) : null;
        const commTm = row[8] ? Number(row[8]) : null;
        
        if (costUZS) {
            costMap[model] = {
                cost_price: costUZS,
                comm_seller: commSeller !== null ? commSeller * 100 : undefined,
                comm_manager: commManager !== null ? commManager * 100 : undefined,
                comm_tm: commTm !== null ? commTm * 100 : undefined
            };
        }
    }
    
    const { data: products } = await supabase.from('products').select('id, model, cost_price');
    
    let updatedCount = 0;
    for (const p of products) {
        if (!p.model) continue;
        
        const normDbModel = normalize(p.model);
        const costData = costMap[normDbModel];
        
        if (costData) {
            const updatePayload = { cost_price: costData.cost_price };
            // Optional: update commissions if they exist in the Excel and are > 0
            if (costData.comm_seller !== undefined) updatePayload.comm_seller = costData.comm_seller;
            if (costData.comm_manager !== undefined) updatePayload.comm_manager = costData.comm_manager;
            if (costData.comm_tm !== undefined) updatePayload.comm_tm = costData.comm_tm;
            
            const { error } = await supabase.from('products').update(updatePayload).eq('id', p.id);
            if (error) {
                console.error('Failed to update', p.model, error);
            } else {
                console.log('Updated cost for', p.model, 'to', costData.cost_price);
                updatedCount++;
            }
        }
    }
    
    console.log(`\nSuccessfully updated cost prices for ${updatedCount} products.`);
}

updateCosts();
