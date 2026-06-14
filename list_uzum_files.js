const fs = require('fs');
const path = require('path');

const dir = 'D:\\Desktop\\uzum yangi mahsulotlar';

async function run() {
    console.log("=== Files in D:\\Desktop\\uzum yangi mahsulotlar ===");
    const list = fs.readdirSync(dir);
    for (const item of list) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
            console.log(`File: ${item} | Size: ${stat.size} bytes`);
        }
    }
}

run().catch(console.error);
