const fs = require('fs');
const path = require('path');

const baseDir = 'D:/Desktop/uzum yangi mahsulotlar';
const stationaryFile = 'D:/Desktop/uzum yangi mahsulotlar/categories/blenders_stationary.json';
const handFile = 'D:/Desktop/uzum yangi mahsulotlar/categories/blenders_hand.json';

const stationary = JSON.parse(fs.readFileSync(stationaryFile, 'utf-8'));
const hand = JSON.parse(fs.readFileSync(handFile, 'utf-8'));

const allLocalIds = [...Object.keys(stationary), ...Object.keys(hand)];
console.log(`Total local products: ${allLocalIds.length}`);

// Get all directories in baseDir
const allDirs = fs.readdirSync(baseDir).filter(f => {
    return fs.statSync(path.join(baseDir, f)).isDirectory() && f !== 'categories' && f !== 'uzum_data' && f !== 'uzum_grouped_colors';
});

console.log(`Found ${allDirs.length} product directories in total.`);

let foundCount = 0;
let missingIds = [];

for (const id of allLocalIds) {
    // Find directory ending with `- id` or containing `- id`
    const match = allDirs.find(d => d.endsWith(`- ${id}`) || d.includes(`-${id}`) || d.endsWith(`-${id}`));
    if (match) {
        foundCount++;
        const files = fs.readdirSync(path.join(baseDir, match)).filter(f => f.startsWith('img_'));
        if (foundCount <= 3) {
            console.log(`Product ${id} matched with directory "${match}". Images:`, files);
        }
    } else {
        missingIds.push(id);
    }
}

console.log(`\nMatched: ${foundCount} / ${allLocalIds.length}`);
console.log(`Missing directories: ${missingIds.length}`);
if (missingIds.length > 0) {
    console.log("Sample missing IDs:", missingIds.slice(0, 5));
}
