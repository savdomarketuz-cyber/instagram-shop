const fs = require('fs');

const id = '848294';
const richFile = 'D:/Desktop/uzum yangi mahsulotlar/product_rich_metadata.json';
const metaFile = 'D:/Desktop/uzum yangi mahsulotlar/product_metadata.json';

if (fs.existsSync(richFile)) {
    const rich = JSON.parse(fs.readFileSync(richFile, 'utf-8'));
    const item = rich[id];
    console.log(`=== In product_rich_metadata.json (ID: ${id}) ===`);
    if (item) {
        console.log(`Found!`);
        console.log(`Keys:`, Object.keys(item));
        console.log(`Image:`, item.image);
        console.log(`Images:`, item.images);
    } else {
        console.log(`Not found.`);
    }
}

if (fs.existsSync(metaFile)) {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    // meta is an array of products or an object? Let's check.
    console.log(`\n=== In product_metadata.json ===`);
    if (Array.isArray(meta)) {
        console.log("It is an Array of length", meta.length);
        const item = meta.find(x => String(x.productId) === id || String(x.id) === id);
        if (item) {
            console.log("Found! Keys:", Object.keys(item));
            console.log("Image:", item.image);
            console.log("Images:", item.images);
        } else {
            console.log("Not found in array.");
        }
    } else {
        console.log("It is an Object of keys length", Object.keys(meta).length);
        const item = meta[id];
        if (item) {
            console.log("Found! Keys:", Object.keys(item));
            console.log("Image:", item.image);
            console.log("Images:", item.images);
        } else {
            console.log("Not found in object.");
        }
    }
}
