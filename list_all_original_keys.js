const fs = require('fs');
const path = require('path');

const richPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\product_rich_metadata.json';
const blendersPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories\\blenders.json';

async function run() {
    const rich = JSON.parse(fs.readFileSync(richPath, 'utf8'));
    const blenders = JSON.parse(fs.readFileSync(blendersPath, 'utf8'));
    const ids = Object.keys(blenders);
    
    const uniqueKeys = new Set();
    ids.forEach(id => {
        const item = rich[id];
        if (item && item.parameters) {
            Object.keys(item.parameters).forEach(k => uniqueKeys.add(k));
        }
    });
    
    console.log("=== All Unique Original Parameter Keys in Excel/JSON for Blenders ===");
    console.log(`Total unique keys: ${uniqueKeys.size}`);
    const sortedKeys = [...uniqueKeys].sort();
    sortedKeys.forEach((k, idx) => console.log(`${idx + 1}. ${k}`));
}

run();
