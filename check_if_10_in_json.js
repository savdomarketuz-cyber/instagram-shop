const fs = require('fs');
const path = require('path');

const stationaryPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories\\blenders_stationary.json';
const handPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories\\blenders_hand.json';

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

async function check(filePath, name) {
    if (!fs.existsSync(filePath)) {
        console.log(`${name} does not exist.`);
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const ids = Object.keys(data);
    
    console.log(`Checking ${name} (${ids.length} products)...`);
    ids.forEach(id => {
        const item = data[id];
        const sku = item.sku || '';
        // Also check if SKU matches one of ours
        const match = targetSkus.find(ts => sku.toUpperCase() === ts.toUpperCase());
        if (match) {
            console.log(`  - Found matching product! ID: ${id} | SKU: ${sku} | Title: ${item.title_uz}`);
        }
    });
}

async function run() {
    await check(stationaryPath, 'blenders_stationary.json');
    await check(handPath, 'blenders_hand.json');
}

run();
