const fs = require('fs');
const path = require('path');

const dir = 'D:\\Desktop\\uzum yangi mahsulotlar';

async function run() {
    console.log(`=== Searching for JSON files in: ${dir} ===`);
    if (!fs.existsSync(dir)) {
        console.log("Directory does not exist.");
        return;
    }
    
    const files = fs.readdirSync(dir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    jsonFiles.forEach(f => {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        console.log(`- File: ${f} | Size: ${stat.size} bytes`);
        
        // Let's print a sample (first 200 chars or array length)
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                console.log(`  Array length: ${parsed.length}`);
                if (parsed.length > 0) {
                    console.log(`  Sample 1st item SKU/name:`, parsed[0].sku || parsed[0].name || parsed[0].title || parsed[0].productId);
                }
            } else {
                console.log(`  Object keys:`, Object.keys(parsed).slice(0, 5));
            }
        } catch (e) {
            console.log(`  Error parsing JSON: ${e.message}`);
        }
    });
}

run();
