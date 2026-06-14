const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'D:/Desktop/asosiy dasturlar/instagram shop/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const jsonPath = 'd:/Desktop/aaa/grills.json';
const baseDir = 'd:/Desktop/aaa';

async function main() {
    console.log("=== GRILLS DATABASE COMPATIBILITY CHECK ===");
    
    // 1. Read JSON
    if (!fs.existsSync(jsonPath)) {
        console.error("Error: grills.json not found!");
        return;
    }
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`Loaded ${Object.keys(data).length} products from grills.json.\n`);
    
    // 2. Fetch categories from Supabase to see if "Elektr grilllar" or "Aerogrillar" exists
    const { data: dbCategories, error: catErr } = await supabase.from('categories').select('id, name, name_uz, name_ru');
    if (catErr) {
        console.error("Error fetching categories:", catErr.message);
        return;
    }
    
    console.log("Existing categories in DB (related to grills):");
    const matchedCats = dbCategories.filter(c => c.name.toLowerCase().includes('gril') || c.name_uz.toLowerCase().includes('gril'));
    if (matchedCats.length > 0) {
        matchedCats.forEach(c => {
            console.log(`  - ID: ${c.id} | Name: ${c.name} | Name UZ: ${c.name_uz}`);
        });
    } else {
        console.log("  No matching category found in DB for 'gril'. We will need to create a new category.");
    }
    console.log("");

    // 3. Fetch products from database to check for potential duplicates
    const { data: dbProducts, error: prodErr } = await supabase.from('products').select('id, sku, barcode');
    if (prodErr) {
        console.error("Error fetching products:", prodErr.message);
        return;
    }
    console.log(`Loaded ${dbProducts.length} existing products from DB.`);

    // 4. Validate each product in JSON
    let duplicateSkusCount = 0;
    let missingImagesCount = 0;
    let invalidPricesCount = 0;
    let missingParamsCount = 0;
    
    const localDirs = fs.readdirSync(baseDir).filter(f => fs.statSync(`${baseDir}/${f}`).isDirectory());

    for (const [id, info] of Object.entries(data)) {
        const brand = info.brand || 'Noma\'lum';
        const model = info.model || '';
        const color = info.color || '';
        
        // Check SKU
        const sku = (brand + "_" + model + "_" + color).toUpperCase().replace(/[^A-Z0-9-]/g, "_").substring(0, 40);
        const isDuplicate = dbProducts.some(dp => dp.sku && dp.sku.toUpperCase() === sku);
        if (isDuplicate) {
            duplicateSkusCount++;
        }

        // Check local images directory
        const matchDir = localDirs.find(d => d.endsWith(`- ${id}`));
        if (!matchDir) {
            missingImagesCount++;
        } else {
            const imgPath = `${baseDir}/${matchDir}`;
            const images = fs.readdirSync(imgPath).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.webp'));
            if (images.length === 0) {
                missingImagesCount++;
            }
        }

        // Check prices
        const prices = info.prices || [];
        if (prices.length === 0 || !prices[0].sellPrice || prices[0].sellPrice <= 0) {
            invalidPricesCount++;
        }

        // Check parameters
        const params = info.parameters || {};
        if (Object.keys(params).length === 0) {
            missingParamsCount++;
        }
    }

    console.log("\n=== VALIDATION SUMMARY ===");
    console.log(`- Duplicates found in DB (by SKU): ${duplicateSkusCount} / ${Object.keys(data).length}`);
    console.log(`- Products with missing local folder/images: ${missingImagesCount}`);
    console.log(`- Products with invalid or zero prices: ${invalidPricesCount}`);
    console.log(`- Products with missing parameters: ${missingParamsCount}`);
    
    if (duplicateSkusCount === 0 && missingImagesCount === 0 && invalidPricesCount === 0) {
        console.log("\nVerdict: The grills dataset is 100% READY and COMPATIBLE for database insertion!");
    } else {
        console.log("\nVerdict: Needs attention before importing (see details above).");
    }
}

main().catch(console.error);
