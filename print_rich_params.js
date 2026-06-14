const fs = require('fs');
const path = require('path');

const richPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\product_rich_metadata.json';
const blendersPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories\\blenders.json';

async function run() {
    const rich = JSON.parse(fs.readFileSync(richPath, 'utf8'));
    const blenders = JSON.parse(fs.readFileSync(blendersPath, 'utf8'));
    const ids = Object.keys(blenders).slice(0, 5);
    
    ids.forEach(id => {
        console.log(`\n======================================`);
        console.log(`Product ID: ${id}`);
        console.log(`Title UZ: ${blenders[id].title_uz}`);
        console.log(`Rich Parameters:`, rich[id].parameters);
        console.log(`Original blenders.json parameters:`, blenders[id].parameters);
    });
}

run();
