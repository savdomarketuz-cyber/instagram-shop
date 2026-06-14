const fs = require('fs');
const path = require('path');

const jsonPath = 'd:/Desktop/aaa/coffee_makers.json';
const baseDir = 'd:/Desktop/aaa';

function inspect() {
    console.log("=== COFFEE MAKERS & MACHINES DETAILED INSPECTION ===\n");

    if (!fs.existsSync(jsonPath)) {
        console.error("Error: coffee_makers.json not found!");
        return;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const totalProducts = Object.keys(data).length;
    console.log(`Jami mahsulotlar soni: ${totalProducts}\n`);

    // 1. Check Titles and Descriptions
    let hasDescCount = 0;
    let missingTitleUz = 0;
    let missingTitleRu = 0;

    for (const [id, info] of Object.entries(data)) {
        if (!info.title_uz) missingTitleUz++;
        if (!info.title_ru) missingTitleRu++;
        if (info.description_uz || info.description_ru || info.desc_uz || info.desc_ru) {
            hasDescCount++;
        }
    }

    console.log("=== 1. SARLAVHALAR VA TAVSIFLAR HOLATI ===");
    console.log(`- Uzbekcha sarlavhasi yo'q mahsulotlar: ${missingTitleUz}`);
    console.log(`- Ruscha sarlavhasi yo'q mahsulotlar: ${missingTitleRu}`);
    console.log(`- Tavsifi mavjud bo'lgan mahsulotlar: ${hasDescCount} / ${totalProducts}`);
    console.log("  (Eslatma: Agar tavsiflar yo'q bo'lsa, ularni keyinchalik avtomatik shakllantirishimiz kerak.)\n");

    // 2. Check Parameters
    console.log("=== 2. PARAMETRLAR HOLATI ===");
    const allParamKeys = {};
    let missingParamsCount = 0;

    for (const [id, info] of Object.entries(data)) {
        const params = info.parameters || {};
        const keys = Object.keys(params);
        if (keys.length === 0) {
            missingParamsCount++;
        } else {
            keys.forEach(k => {
                allParamKeys[k] = (allParamKeys[k] || 0) + 1;
            });
        }
    }

    console.log(`- Umuman parametri yo'q mahsulotlar: ${missingParamsCount}`);
    console.log("- Mavjud parametr kalitlari (va ularning uchrash soni):");
    const sortedKeys = Object.entries(allParamKeys).sort((a, b) => b[1] - a[1]);
    sortedKeys.forEach(([k, count]) => {
        console.log(`  * '${k}': ${count} ta mahsulotda`);
    });
    console.log("");

    // 3. Check Folders and Images
    console.log("=== 3. PAPKALAR VA RASMLAR HOLATI ===");
    const localDirs = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

    let matchedCount = 0;
    let missingFolders = [];
    let foldersWithSubfolders = [];
    let emptyFolders = [];
    let totalImagesCount = 0;

    for (const [id, info] of Object.entries(data)) {
        const matchDir = localDirs.find(d => d.endsWith(`- ${id}`) || d.includes(`-${id}`) || d.endsWith(`-${id}`));
        
        if (!matchDir) {
            missingFolders.push({ id, title: info.title_uz });
            continue;
        }

        matchedCount++;
        const fullPath = path.join(baseDir, matchDir);
        const files = fs.readdirSync(fullPath);
        
        const subdirs = files.filter(f => fs.statSync(path.join(fullPath, f)).isDirectory());
        const images = files.filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.webp'));
        
        totalImagesCount += images.length;

        if (subdirs.length > 0) {
            foldersWithSubfolders.push({ id, dir: matchDir, subdirs });
        }
        if (images.length === 0 && subdirs.length === 0) {
            emptyFolders.push({ id, dir: matchDir });
        }
    }

    console.log(`- Topilgan local papkalar: ${matchedCount} / ${totalProducts}`);
    
    if (missingFolders.length > 0) {
        console.log("- PAPKASI TOPILMAGAN mahsulotlar:");
        missingFolders.forEach(f => console.log(`  * ID: ${f.id} | Title: ${f.title}`));
    } else {
        console.log("- Barcha mahsulotlarning papkalari topildi! (100% moslik)");
    }

    if (foldersWithSubfolders.length > 0) {
        console.log("\n- Ichida variantli papkalari bor (Split) papkalar:");
        foldersWithSubfolders.forEach(f => {
            console.log(`  * ID: ${f.id} | Papka: ${f.dir}`);
            console.log(`    Ichki papkalar: ${f.subdirs.join(', ')}`);
        });
    } else {
        console.log("- Ichki variant papkalari (split folders) topilmadi. Barchasida rasmlar to'g'ridan-to'g'ri joylashgan.");
    }

    if (emptyFolders.length > 0) {
        console.log("\n- Rasmi yo'q bo'sh papkalar:");
        emptyFolders.forEach(f => console.log(`  * ID: ${f.id} | Papka: ${f.dir}`));
    }
    
    console.log(`- Jami local rasmlar soni: ${totalImagesCount}`);
}

inspect();
