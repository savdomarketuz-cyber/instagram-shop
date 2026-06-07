const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanString(s) {
    if (!s) return '';
    return String(s).trim();
}

async function fixPrices() {
    console.log("Reading original prices from Excel...");
    const wb = xlsx.readFile('D:\\Desktop\\velari narx\\extracted_products.xlsx');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    
    // We need to map models or product identifiers to their original price and old_price
    // Looking at the Yandex template, what are the exact column names?
    // Let's print out the first row's keys to be sure.
    if (rows.length > 0) {
        console.log("Excel columns:", Object.keys(rows[0]));
    }
}
fixPrices();
