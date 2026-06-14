const fs = require('fs');

const file = 'D:/Desktop/uzum yangi mahsulotlar/_page_84.json';
if (fs.existsSync(file)) {
    const items = JSON.parse(fs.readFileSync(file, 'utf-8'));
    console.log("Total items in _page_84.json:", items.length);
    console.log("First 3 items:", JSON.stringify(items.slice(0, 3), null, 2));
} else {
    console.log("File not found");
}
