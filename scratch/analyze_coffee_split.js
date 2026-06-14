const fs = require('fs');

const jsonPath = 'd:/Desktop/aaa/coffee_makers.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const coffeeMachines = [];
const coffeeMakers = [];

for (const [id, info] of Object.entries(data)) {
    const title = (info.title_uz || '').toLowerCase();
    
    // Logic to distinguish:
    // "kofe mashinasi", "kofemashina", "kofe mashina", "espresso", "kapsulali" -> Coffee Machines (Kofe mashinalari)
    // "kofe qaynatgich", "qahva qaynatgich", "tomchili", "turk", "tomchilatib", "kofemolka", "qahva maydalagich" -> Coffee Makers (Kofe qaynatgichlar)
    
    let isMachine = false;
    if (title.includes('mashina') || title.includes('mashinka') || title.includes('espresso') || title.includes('kapsula') || title.includes('cappuccino') || title.includes('barista') || title.includes('latte')) {
        isMachine = true;
    }
    
    // Let's refine based on specific exceptions or double-checks
    if (title.includes('tomchili') || title.includes('qaynatgich') || title.includes('turk') || title.includes('kofemolka') || title.includes('maydalagich')) {
        isMachine = false;
    }

    const item = { id, title: info.title_uz, brand: info.brand, model: info.model };
    if (isMachine) {
        coffeeMachines.push(item);
    } else {
        coffeeMakers.push(item);
    }
}

console.log("=== COFFEE MACHINES (Kofe mashinalari) ===");
console.log(`Total: ${coffeeMachines.length}`);
coffeeMachines.slice(0, 15).forEach(item => {
    console.log(`  - [ID: ${item.id}] ${item.brand} ${item.model} | ${item.title}`);
});
if (coffeeMachines.length > 15) console.log("  ...");

console.log("\n=== COFFEE MAKERS (Kofe qaynatgichlar) ===");
console.log(`Total: ${coffeeMakers.length}`);
coffeeMakers.slice(0, 15).forEach(item => {
    console.log(`  - [ID: ${item.id}] ${item.brand} ${item.model} | ${item.title}`);
});
if (coffeeMakers.length > 15) console.log("  ...");
