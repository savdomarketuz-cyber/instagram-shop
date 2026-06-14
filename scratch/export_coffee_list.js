const fs = require('fs');

const jsonPath = 'd:/Desktop/aaa/coffee_makers.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const items = [];
for (const [id, info] of Object.entries(data)) {
    items.push({
        id,
        title_uz: info.title_uz,
        brand: info.brand,
        model: info.model,
        parameters: info.parameters
    });
}

// Save all items to a text file for inspection
fs.writeFileSync('D:/Desktop/asosiy dasturlar/instagram shop/scratch/all_coffee_items.txt', JSON.stringify(items, null, 2));
console.log(`Saved ${items.length} items to scratch/all_coffee_items.txt`);
