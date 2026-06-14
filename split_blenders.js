const fs = require('fs');
const path = require('path');

const inputPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories\\blenders.json';
const outputDir = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories';

// Custom parameters for tabletop blenders (Statsionar blenderlar)
const statsionarParams = {
  "Quvvat, Vt": null,
  "Piyola materiali": null,
  "Filtr uchun rang": null,
  "Tezlik soni": null,
  "Qo'shimcha funktsiyalar": null,
  "Qo'shimchalar": null,
  "Ko'za hajmi, l": null,
  "Maydalagichning sig'imi, l": null,
  "Dizayn xususiyatlari": null,
  "Control": null,
  "Rejimlar": null,
  "O'lchov stakanining hajmi, l": null,
  "Smartfondan boshqarish": null,
  "Korpus materiali": null,
  "Tarmoq simining uzunligi, m": null,
  "Kengligi, sm": null,
  "Chuqurlik, sm": null,
  "Balandligi, sm": null,
  "Og'irligi, kg": null,
  "Qo'shimcha ma'lumot": null,
  "Smart home tizimida ishlaydi": null,
  "Aqlli uy ekotizimi": null,
  "Ishlab chiqaruvchidan rang nomi": null
};

// Custom parameters for hand blenders (Qo'l blenderlari)
const handParams = {
  "Quvvat, Vt": null,
  "Piyola materiali": null,
  "Material immersion qism": null,
  "Filtr uchun rang": null,
  "Tezlik soni": null,
  "Qo'shimcha funktsiyalar": null,
  "Qo'shimchalar": null,
  "Ko'za hajmi, l": null,
  "Maydalagichning sig'imi, l": null,
  "Dizayn xususiyatlari": null,
  "Control": null,
  "Rejimlar": null,
  "O'lchov stakanining hajmi, l": null,
  "Korpus materiali": null,
  "Tarmoq simining uzunligi, m": null,
  "Kengligi, sm": null,
  "Chuqurlik, sm": null,
  "Balandligi, sm": null,
  "Og'irligi, kg": null,
  "Qo'shimcha ma'lumot": null,
  "Smart home tizimida ishlaydi": null,
  "Aqlli uy ekotizimi": null,
  "Ishlab chiqaruvchidan rang nomi": null
};

async function run() {
    if (!fs.existsSync(inputPath)) {
        console.error("Input file not found:", inputPath);
        return;
    }
    
    const content = fs.readFileSync(inputPath, 'utf8');
    const blenders = JSON.parse(content);
    
    const stationary = {};
    const hand = {};
    
    const ids = Object.keys(blenders);
    console.log(`Total products to classify: ${ids.length}`);
    
    ids.forEach(id => {
        const item = blenders[id];
        const titleUz = (item.title_uz || '').toLowerCase();
        const titleRu = (item.title_ru || '').toLowerCase();
        const descUz = (item.description_uz || '').toLowerCase();
        const descRu = (item.description_ru || '').toLowerCase();
        const model = (item.model || '').toLowerCase();
        
        // Hand blender keywords
        const handKeywords = [
            "qo'l", "qol", "cho'ktiriluvchi", "choktiriluvchi", "suvosti", "suv osti",
            "погружной", "ручной", "immersion", "hand", "mq", "hb", "sf-8070", "sf-8030",
            "sf-8026", "sf-8081", "sf-8013", "sf-8085", "sf-8055", "sf-8153", "sf-8152", "sf-3622"
        ];
        
        const isHandBlender = handKeywords.some(keyword => 
            titleUz.includes(keyword) || 
            titleRu.includes(keyword) ||
            descUz.includes(keyword) ||
            descRu.includes(keyword) ||
            model.includes(keyword)
        );
        
        // Prepare new item
        const newItem = { ...item };
        
        if (isHandBlender) {
            newItem.parameters = { ...handParams };
            newItem.category_uz = "Qo'l blenderlari";
            newItem.category_ru = "Погружные блендеры";
            newItem.category_key = "hand_blenders";
            hand[id] = newItem;
        } else {
            newItem.parameters = { ...statsionarParams };
            newItem.category_uz = "Blenderlar";
            newItem.category_ru = "Блендеры";
            newItem.category_key = "blenders";
            stationary[id] = newItem;
        }
    });
    
    const statKeys = Object.keys(stationary);
    const handKeys = Object.keys(hand);
    
    console.log(`\nClassification Summary:`);
    console.log(`- Statsionar blenderlar: ${statKeys.length} ta mahsulot`);
    console.log(`- Qo'l blenderlari: ${handKeys.length} ta mahsulot`);
    
    console.log(`\nSample Statsionar:`);
    if (statKeys.length > 0) {
        console.log(`  - Title: ${stationary[statKeys[0]].title_uz}`);
    }
    
    console.log(`\nSample Qo'l blenderi:`);
    if (handKeys.length > 0) {
        console.log(`  - Title: ${hand[handKeys[0]].title_uz}`);
    }
    
    // Save files
    const statPath = path.join(outputDir, 'blenders_stationary.json');
    const handPath = path.join(outputDir, 'blenders_hand.json');
    
    fs.writeFileSync(statPath, JSON.stringify(stationary, null, 2), 'utf8');
    fs.writeFileSync(handPath, JSON.stringify(hand, null, 2), 'utf8');
    
    console.log(`\nSuccessfully saved:`);
    console.log(`- ${statPath}`);
    console.log(`- ${handPath}`);
}

run();
