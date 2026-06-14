const fs = require('fs');
const path = require('path');

const metadataPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\product_metadata.json';
const richPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\product_rich_metadata.json';

const targetSkus = [
    'ORVICA-ORM-2025',
    'ORVICA-ORM-2023',
    'ORVICA-ORM-2015',
    'ORVICA-ORM-7912',
    'ORVICA-ORM-2012',
    'ORVICA-ORM-2006-3',
    'UAKEEN-ZL-2402-QORA',
    'ORVICA-ORM-7913',
    'ORVICA-ORM-7913-3',
    'ORVICA-ORM-3622'
];

async function checkFile(filePath, name) {
    if (!fs.existsSync(filePath)) {
        console.log(`${name} does not exist.`);
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const keys = Object.keys(data);
    console.log(`Checking ${name} (${keys.length} items)...`);
    
    keys.forEach(k => {
        const item = data[k];
        const sku = item.sku || '';
        // Also check if any price SKU matches or model/brand
        const match = targetSkus.find(ts => sku.toUpperCase() === ts.toUpperCase());
        if (match) {
            console.log(`  - Found by SKU: "${sku}" in item "${k}" | Title: ${item.title_uz}`);
            return;
        }
        
        // Sometimes the SKU is stored in prices array
        if (item.prices && Array.isArray(item.prices)) {
            const priceMatch = item.prices.some(p => p.skuId && targetSkus.some(ts => String(p.skuId).toUpperCase() === ts.toUpperCase()));
            if (priceMatch) {
                console.log(`  - Found by price skuId in item "${k}" | Title: ${item.title_uz}`);
                return;
            }
        }
        
        // Or check model
        const model = item.model || '';
        const brand = item.brand || '';
        const modelMatch = targetSkus.some(ts => ts.toUpperCase().includes(model.toUpperCase()) && ts.toUpperCase().includes(brand.toUpperCase()));
        if (modelMatch && model) {
            console.log(`  - Potential Match by Brand/Model: "${brand} ${model}" in item "${k}" | Title: ${item.title_uz}`);
        }
    });
}

async function run() {
    await checkFile(metadataPath, 'product_metadata.json');
    await checkFile(richPath, 'product_rich_metadata.json');
}

run();
