const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'D:/Desktop/asosiy dasturlar/instagram shop/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: dbCategories, error } = await supabase
        .from('categories')
        .select('*');
        
    if (error) {
        console.error("Error fetching categories:", error.message);
        return;
    }
    
    console.log("=== COFFEE-RELATED CATEGORIES IN DB ===");
    const coffeeCats = dbCategories.filter(c => 
        (c.name && c.name.toLowerCase().includes('kof')) || 
        (c.name_uz && c.name_uz.toLowerCase().includes('kof')) || 
        (c.name_ru && c.name_ru.toLowerCase().includes('коф'))
    );
    
    if (coffeeCats.length > 0) {
        coffeeCats.forEach(c => {
            console.log(`- ID: ${c.id} | Parent: ${c.parent_id} | Name: ${c.name} | UZ: ${c.name_uz} | RU: ${c.name_ru}`);
        });
    } else {
        console.log("No coffee-related categories found.");
    }
    
    console.log("\n=== ALL CATEGORIES LIST ===");
    dbCategories.forEach(c => {
        console.log(`- ID: ${c.id} | Parent: ${c.parent_id} | UZ: ${c.name_uz}`);
    });
}

main().catch(console.error);
