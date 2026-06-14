const fs = require('fs');
const path = require('path');

const blendersPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories\\blenders.json';
const richPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\product_rich_metadata.json';
const brandedPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\product_metadata_branded.json';
const metadataPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\product_metadata.json';

async function run() {
    if (!fs.existsSync(blendersPath)) {
        console.error("blenders.json not found");
        return;
    }
    
    const blenders = JSON.parse(fs.readFileSync(blendersPath, 'utf8'));
    const blenderIds = Object.keys(blenders);
    console.log(`Loaded ${blenderIds.length} blender products from blenders.json.`);
    
    // Check rich metadata
    if (fs.existsSync(richPath)) {
        const rich = JSON.parse(fs.readFileSync(richPath, 'utf8'));
        const matched = blenderIds.filter(id => rich[id]);
        console.log(`Matched in product_rich_metadata.json: ${matched.length} / ${blenderIds.length}`);
        if (matched.length > 0) {
            console.log(`Sample rich parameters for ${matched[0]}:`, rich[matched[0]].parameters);
        }
    }
    
    // Check branded metadata
    if (fs.existsSync(brandedPath)) {
        const branded = JSON.parse(fs.readFileSync(brandedPath, 'utf8'));
        const matched = blenderIds.filter(id => branded[id]);
        console.log(`Matched in product_metadata_branded.json: ${matched.length} / ${blenderIds.length}`);
        if (matched.length > 0) {
            console.log(`Sample branded parameters for ${matched[0]}:`, branded[matched[0]].parameters);
        }
    }
    
    // Check main product_metadata
    if (fs.existsSync(metadataPath)) {
        const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const matched = blenderIds.filter(id => meta[id]);
        console.log(`Matched in product_metadata.json: ${matched.length} / ${blenderIds.length}`);
        if (matched.length > 0) {
            console.log(`Sample metadata parameters for ${matched[0]}:`, meta[matched[0]].parameters);
        }
    }
}

run();
