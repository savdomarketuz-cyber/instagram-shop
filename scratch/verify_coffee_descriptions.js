const fs = require('fs');

const data = JSON.parse(fs.readFileSync('d:/Desktop/aaa/coffee_makers.json', 'utf-8'));
const keys = Object.keys(data);

console.log("=== COFFEE ITEM 1 ===");
console.log("Title (UZ):", data[keys[0]].title_uz);
console.log("Description (UZ):", data[keys[0]].description_uz);
console.log("Description (RU):", data[keys[0]].description_ru);

console.log("\n=== COFFEE ITEM 2 ===");
console.log("Title (UZ):", data[keys[8]].title_uz);
console.log("Description (UZ):", data[keys[8]].description_uz);
console.log("Description (RU):", data[keys[8]].description_ru);
