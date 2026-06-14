const fs = require('fs');
const path = require('path');

const rootDir = 'D:\\Desktop';

function scanDir(dir, jsonFiles = []) {
    try {
        const list = fs.readdirSync(dir);
        for (const item of list) {
            const fullPath = path.join(dir, item);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch (e) {
                continue;
            }
            
            if (stat.isDirectory()) {
                if (item === 'node_modules' || item === '.git' || item === '.next' || item === 'asosiy dasturlar' || item === 'flutter_sdk') {
                    continue;
                }
                scanDir(fullPath, jsonFiles);
            } else if (stat.isFile() && item.endsWith('.json')) {
                jsonFiles.push(fullPath);
            }
        }
    } catch (e) {
        // Skip unreadable
    }
    return jsonFiles;
}

async function run() {
    console.log("Scanning recursively for JSON files...");
    const files = scanDir(rootDir);
    console.log(`Found ${files.length} JSON files.`);
    
    for (const f of files) {
        // Only inspect files under 5MB to avoid memory crash
        const stat = fs.statSync(f);
        if (stat.size > 5 * 1024 * 1024) continue;
        
        try {
            const content = fs.readFileSync(f, 'utf8');
            // Check if it contains "blender" or "Sonifer" and is an array or object
            if (content.toLowerCase().includes('blender') && content.toLowerCase().includes('sonifer')) {
                const parsed = JSON.parse(content);
                const isArray = Array.isArray(parsed);
                const len = isArray ? parsed.length : Object.keys(parsed).length;
                console.log(`- Match: ${f} | Size: ${stat.size} bytes | Items/Keys: ${len} | IsArray: ${isArray}`);
                
                // If it has around 77 items, it's definitely the one!
                if (isArray && len >= 50 && len <= 100) {
                    console.log(`  >>> THIS MIGHT BE THE 77 BLENDER PRODUCTS FILE!`);
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
}

run();
