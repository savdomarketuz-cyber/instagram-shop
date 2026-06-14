const fs = require('fs');

const jsonPath = 'd:/Desktop/aaa/coffee_makers.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const coffeeMachines = [];
const coffeeMakers = [];

for (const [id, info] of Object.entries(data)) {
    const title = (info.title_uz || '').toLowerCase();
    const params = info.parameters || {};
    
    // Check parameters for pressure or espresso modes
    let hasPressure = false;
    for (const [k, v] of Object.entries(params)) {
        const keyLower = k.toLowerCase();
        const valStr = String(v).toLowerCase();
        if (keyLower.includes('pressure') || valStr.includes('bar') || valStr.includes('бар')) {
            hasPressure = true;
        }
        if (valStr.includes('espresso') || valStr.includes('cappuccino') || valStr.includes('latte')) {
            hasPressure = true;
        }
    }
    
    let isMachine = false;
    if (
        title.includes('mashina') || 
        title.includes('mashinka') || 
        title.includes('kapsula') || 
        title.includes('espresso') || 
        title.includes('cappuccino') || 
        title.includes('barista') || 
        title.includes('latte') || 
        title.includes('rojog') ||
        title.includes('tabletkalari') || // Cleaning tablets
        hasPressure
    ) {
        isMachine = true;
    }
    
    // Drip/Turk coffee makers are strictly coffee makers, even if they mention espresso-like strength
    if (title.includes('tomchili') && !hasPressure) {
        isMachine = false;
    }
    if (title.includes('turka') || title.includes('turk kofesi')) {
        isMachine = false;
    }

    const item = { id, title: info.title_uz, brand: info.brand, model: info.model };
    if (isMachine) {
        coffeeMachines.push(item);
    } else {
        coffeeMakers.push(item);
    }
}

console.log("=== RE-CLASSIFIED COFFEE MACHINES (Kofe mashinalari) ===");
console.log(`Total: ${coffeeMachines.length}`);
coffeeMachines.forEach(item => {
    console.log(`  - [ID: ${item.id}] ${item.brand} ${item.model} | ${item.title}`);
});

console.log("\n=== RE-CLASSIFIED COFFEE MAKERS (Kofe qaynatgichlar) ===");
console.log(`Total: ${coffeeMakers.length}`);
coffeeMakers.forEach(item => {
    console.log(`  - [ID: ${item.id}] ${item.brand} ${item.model} | ${item.title}`);
});
