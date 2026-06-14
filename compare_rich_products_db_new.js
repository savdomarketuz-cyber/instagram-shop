const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const LOCAL_JSON_PATH = 'D:/Desktop/uzum yangi mahsulotlar/product_rich_metadata.json';
const REPORT_PATH = 'D:/Desktop/uzum yangi mahsulotlar/db_rich_comparison_report_new.json';

// Helper to normalize string for comparison
function cleanStr(s) {
    if (!s) return "";
    return s.toString().toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

async function compare() {
    if (!fs.existsSync(LOCAL_JSON_PATH)) {
        console.error("Local JSON file not found at:", LOCAL_JSON_PATH);
        return;
    }
    const localData = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, 'utf-8'));
    const localPids = Object.keys(localData);
    console.log(`Loaded ${localPids.length} local products from rich JSON.`);

    // Fetch brands from DB
    const { data: dbBrands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name');
        
    if (brandsError) {
        console.error("Error fetching brands:", brandsError);
        return;
    }
    
    const brandIdToName = {};
    dbBrands.forEach(b => {
        brandIdToName[b.id] = b.name.toLowerCase().trim();
    });

    // Fetch products from DB
    console.log("Fetching products from database...");
    const { data: dbProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name_ru, name_uz, sku, model, brand_id')
        .eq('is_deleted', false);
        
    if (productsError) {
        console.error("Error fetching products:", productsError);
        return;
    }
    console.log(`Fetched ${dbProducts.length} active products from database.`);

    const matches = [];
    const missing = [];

    localPids.forEach(pid => {
        const localProd = localData[pid];
        const localBrandClean = cleanStr(localProd.brand);
        const localModelClean = cleanStr(localProd.model);
        
        if (!localBrandClean || !localModelClean || localModelClean === "unknown") {
            missing.push({
                pid,
                brand: localProd.brand,
                model: localProd.model,
                color: localProd.color,
                reason: "no_valid_brand_or_model"
            });
            return;
        }

        // Find matches in dbProducts
        const dbMatches = dbProducts.filter(p => {
            const dbBrandName = brandIdToName[p.brand_id] || "";
            const dbBrandClean = cleanStr(dbBrandName);
            const dbModelClean = cleanStr(p.model);
            const dbSkuClean = cleanStr(p.sku);
            
            // Check brand match first
            const brandMatches = (dbBrandClean === localBrandClean) || 
                                 (dbSkuClean.startsWith(localBrandClean));
            
            if (!brandMatches) return false;
            
            // Model matches
            const modelMatches = (dbModelClean === localModelClean) || 
                                 (dbSkuClean.endsWith(localModelClean)) ||
                                 (dbSkuClean === localBrandClean + localModelClean);
                                 
            return modelMatches;
        });

        if (dbMatches.length > 0) {
            matches.push({
                pid,
                brand: localProd.brand,
                model: localProd.model,
                color: localProd.color,
                dbProducts: dbMatches.map(p => ({
                    id: p.id,
                    sku: p.sku,
                    model: p.model,
                    name_uz: p.name_uz,
                    brand: brandIdToName[p.brand_id]
                }))
            });
        } else {
            missing.push({
                pid,
                brand: localProd.brand,
                model: localProd.model,
                color: localProd.color
            });
        }
    });

    const summary = {
        total_checked: localPids.length,
        matched_count: matches.length,
        missing_count: missing.length,
        match_percentage: ((matches.length / localPids.length) * 100).toFixed(1)
    };

    const report = {
        summary,
        matches,
        missing
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Comparison finished!`);
    console.log(`Total checked: ${summary.total_checked}`);
    console.log(`Matched: ${summary.matched_count}`);
    console.log(`Missing: ${summary.missing_count}`);
    console.log(`Saved report to ${REPORT_PATH}`);
}

compare();
