const fs = require('fs');
const path = require('path');

const richPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\product_rich_metadata.json';
const stationaryPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories\\blenders_stationary.json';
const handPath = 'D:\\Desktop\\uzum yangi mahsulotlar\\categories\\blenders_hand.json';

// Helper to translate colors to Uzbek
function translateColor(color) {
    if (!color) return null;
    const c = String(color).toLowerCase().trim();
    if (c.includes('pink') || c.includes('пуш')) return 'Pushti';
    if (c.includes('white') || c.includes('бел')) return 'Oq';
    if (c.includes('black') || c.includes('черн')) return 'Qora';
    if (c.includes('silver') || c.includes('сереб')) return 'Kumushrang';
    if (c.includes('grey') || c.includes('gray') || c.includes('сер')) return 'Kulrang';
    if (c.includes('gold') || c.includes('золот')) return 'Tilla rang';
    if (c.includes('red') || c.includes('крас')) return 'Qizil';
    if (c.includes('green') || c.includes('зел')) return 'Yashil';
    if (c.includes('blue') || c.includes('син')) return 'Ko\'k';
    return color; // Return original if unknown
}

// Helper to translate materials to Uzbek
function translateMaterial(mat) {
    if (!mat) return null;
    let m = String(mat).toLowerCase().trim();
    if (m.includes('glass') && m.includes('plastic')) return 'Shisha va plastik';
    if (m.includes('стекло') && m.includes('пластик')) return 'Shisha va plastik';
    if (m.includes('glass') || m.includes('стекло')) return 'Shisha';
    if (m.includes('plastic') || m.includes('пластик')) return 'Plastik';
    if (m.includes('stainless steel') || m.includes('нержавеющая сталь')) return 'Zanglamaydigan po\'lat';
    if (m.includes('metal') || m.includes('металл')) return 'Metall';
    if (m.includes('steel') || m.includes('сталь')) return 'Po\'lat';
    return mat;
}

// Helper to translate control type to Uzbek
function translateControl(ctrl) {
    if (!ctrl) return null;
    const c = String(ctrl).toLowerCase().trim();
    if (c.includes('dial') || c.includes('поворот')) return 'Aylanma mexanik';
    if (c.includes('button') || c.includes('кноп')) return 'Tugmali';
    if (c.includes('mechanical') || c.includes('механич')) return 'Mexanik';
    if (c.includes('sensor') || c.includes('сенсор')) return 'Sensorli';
    return ctrl;
}

// Strictly clean Tezlik soni
function cleanTezlik(val) {
    if (!val) return null;
    const s = String(val).toLowerCase().trim();
    if (s === 'есть' || s === 'yes' || s === 'true' || s === 'not specified' || s === 'speed control' || s === 'speed' || s === 'no' || s === 'false' || s === 'есть скорость') {
        return null;
    }
    
    // Extract leading number (e.g. "2 speeds" / "2 скорости" -> "2")
    const numMatch = s.match(/^(\d+)/);
    if (numMatch) {
        return numMatch[1];
    }
    
    if (s.includes('multi-speed') || s.includes('multi') || s.includes('ko\'p') || s.includes('много')) {
        return "Ko'p tezlikli";
    }
    
    return null; // Ignore non-numeric modes like "standard, turbo"
}

// Clean and translate Russian/English parameter texts to Uzbek
function translateToUzbek(val) {
    if (!val) return null;
    if (typeof val !== 'string') return val;
    
    let str = val;
    
    const replacements = [
        { rx: /3в1/g, rep: "3 tasi 1 da" },
        { rx: /4в1/g, rep: "4 tasi 1 da" },
        { rx: /5в1/g, rep: "5 tasi 1 da" },
        { rx: /3 in 1/ig, rep: "3 tasi 1 da" },
        { rx: /4 in 1/ig, rep: "4 tasi 1 da" },
        { rx: /5 in 1/ig, rep: "5 tasi 1 da" },
        
        { rx: /Смузи/g, rep: "Smuzi" },
        { rx: /Кофе/g, rep: "Kofe" },
        { rx: /Измельчение/g, rep: "Maydalash" },
        { rx: /измельчитель/g, rep: "maydalagich" },
        { rx: /кофемолка/g, rep: "kofe maydalagich" },
        { rx: /блендер/g, rep: "blender" },
        
        { rx: /Смузи, коктейли, соусы, пюре/g, rep: "Smuzi, kokteyllar, souslar, pyure" },
        { rx: /Замешивание теста/g, rep: "Xamir qorishtirish" },
        { rx: /Дробление льда, зерен, орехов/g, rep: "Muz, donlar, yong'oqlarni maydalash" },
        { rx: /Измельчение овощей, фруктов/g, rep: "Sabzavot va mevalarni maydalash" },
        
        { rx: /стационарный блендер/ig, rep: "statsionar blender" },
        { rx: /погружной блендер/ig, rep: "qo'l blenderi" },
        { rx: /ручной/ig, rep: "qo'l" },
        
        { rx: /титановые/ig, rep: "titanli" },
        { rx: /титан/ig, rep: "titan" },
        { rx: /нержавеющая сталь/ig, rep: "zanglamaydigan po'lat" },
        { rx: /закаленное стекло/ig, rep: "bardoshli shisha" },
        { rx: /стекло/ig, rep: "shisha" },
        { rx: /пластик/ig, rep: "plastik" },
        { rx: /металл/ig, rep: "metall" },
        
        { rx: /есть/ig, rep: "bor" },
        { rx: /нет/ig, rep: "yo'q" },
        
        { rx: /гарантия/ig, rep: "kafolat" },
        { rx: /год/ig, rep: "yil" },
        { rx: /лет/ig, rep: "yil" },
        
        { rx: /литра|литр|литра|л/g, rep: "l" },
        { rx: /liters|liter|l/g, rep: "l" },
        { rx: /мл|мl/ig, rep: "ml" },
        { rx: /MAX/g, rep: "maks" }
    ];
    
    replacements.forEach(r => {
        str = str.replace(r.rx, r.rep);
    });
    
    // Normalize spaces
    return str.replace(/\s+/g, ' ').trim();
}

// Main mapping function
function mapItem(item, richItem) {
    const raw = richItem.parameters || {};
    
    // 1. Quvvat (Using robust regex replacement)
    let quvvat = raw.power || raw.Power || raw.power_rating || raw.motor_power;
    if (quvvat) {
        quvvat = String(quvvat).replace(/\b(\d+)\s*(w|watt|watts|vt|вт|в)\b/ig, '$1 Vt').trim();
        quvvat = translateToUzbek(quvvat);
    }
    
    // 2. Piyola materiali
    let piyola = raw.bowl_capacity_material || raw.bowl_material || raw.jar_material || raw.jug_material;
    if (!piyola && raw.material) {
        const mat = String(raw.material).toLowerCase();
        if (mat.includes('glass') || mat.includes('plastic') || mat.includes('стекло') || mat.includes('пластик')) {
            piyola = raw.material;
        }
    }
    if (!piyola && raw.materials && raw.materials.bowl) {
        piyola = raw.materials.bowl;
    }
    piyola = translateMaterial(piyola);
    
    // 3. Material immersion qism (for hand blenders)
    let immersion = raw.blade_material || raw.shaft_material;
    if (!immersion && raw.material) {
        const mat = String(raw.material).toLowerCase();
        if (mat.includes('metal') || mat.includes('steel') || mat.includes('сталь') || mat.includes('металл')) {
            immersion = raw.material;
        }
    }
    immersion = translateMaterial(immersion);
    
    // 4. Filtr uchun rang
    let rang = translateColor(richItem.color || raw.color || raw.Color || raw.base_color);
    
    // 5. Tezlik soni (using strict clean function)
    let tezlik = cleanTezlik(raw.speed_settings || raw.speed || raw.Speed || raw.speeds || raw.speed_modes || raw.speed_control);
    
    // 6. Qo'shimcha funktsiyalar
    let qoshimchaFunk = raw.additional_features || raw.special_features || raw.specialFeatures || raw.features;
    if (Array.isArray(qoshimchaFunk)) {
        qoshimchaFunk = qoshimchaFunk.join(', ');
    }
    qoshimchaFunk = translateToUzbek(qoshimchaFunk);
    
    // 7. Qo'shimchalar
    let qoshimchalar = raw.attachments || raw.accessories || raw.Accessories || raw.additional_accessories || raw.package_includes || raw.package_contents || raw.components;
    if (Array.isArray(qoshimchalar)) {
        qoshimchalar = qoshimchalar.join(', ');
    }
    qoshimchalar = translateToUzbek(qoshimchalar);
    
    // 8. Ko'za hajmi
    let koza = raw.capacity || raw.Capacity || raw.volume || raw.Volume || raw.jar_capacity || raw.jug_capacity || raw.blender_jar;
    if (koza) {
        koza = translateToUzbek(koza);
    }
    
    // 9. Maydalagichning sig'imi
    let maydalagich = raw.capacity_chopper || raw.grinder_capacity || raw.chopper_capacity || raw.coffee_grinder_capacity;
    if (maydalagich) {
        maydalagich = translateToUzbek(maydalagich);
    }
    
    // 10. Dizayn xususiyatlari
    let dizayn = raw.design_features || raw.blade_type || raw.blade_count || raw.blades || raw.blade || raw.number_of_blades;
    if (Array.isArray(dizayn)) {
        dizayn = dizayn.join(', ');
    }
    dizayn = translateToUzbek(dizayn);
    
    // 11. Control
    let control = translateControl(raw.control_type || raw.control || raw.Control || raw.control_panel || raw.control_buttons || raw.control_features || raw.buttons);
    
    // 12. Rejimlar
    let rejimList = [];
    if (raw.pulse_function && String(raw.pulse_function).toLowerCase() !== 'no' && String(raw.pulse_function).toLowerCase() !== 'false') {
        rejimList.push('Pulsatsiyali rejim (Pulse)');
    }
    if (raw.turbo_mode && String(raw.turbo_mode).toLowerCase() !== 'no') {
        rejimList.push('Turbo rejim');
    }
    if (raw.ice_crush && String(raw.ice_crush).toLowerCase() !== 'no') {
        rejimList.push('Muz maydalash');
    }
    if (raw.modes) {
        if (Array.isArray(raw.modes)) {
            rejimList.push(...raw.modes);
        } else {
            rejimList.push(raw.modes);
        }
    }
    let rejimlar = rejimList.length > 0 ? [...new Set(rejimList)].map(translateToUzbek).join(', ') : null;
    
    // 13. O'lchov stakani
    let olchovStakan = raw.measuring_cup || raw.measurements || raw.blender_cups;
    if (olchovStakan) {
        olchovStakan = translateToUzbek(olchovStakan);
    }
    
    // 14. Korpus materiali
    let korpus = raw.body_material || raw.material;
    if (raw.materials && raw.materials.motor_body) {
        korpus = raw.materials.motor_body;
    }
    korpus = translateMaterial(korpus);
    
    // 15. Tarmoq simining uzunligi
    let sim = raw.cord_length || raw.sim_uzunligi || raw.cable_length;
    if (sim) {
        sim = String(sim).trim();
    }
    
    // 16. Og'irligi
    let ogirlik = raw.product_weight || raw.weight || raw.weight_kg;
    if (ogirlik) {
        ogirlik = String(ogirlik).trim();
    }
    
    // 17. Qo'shimcha ma'lumot (warranty/guarantee with regex replacement)
    let qoshimchaMaul = raw.warranty || raw.guarantee || raw.usage || raw.uses;
    if (qoshimchaMaul) {
        qoshimchaMaul = String(qoshimchaMaul)
            .replace(/\b(\d+)\s*(year|years|года|лет|год)\b/ig, '$1 yil kafolat')
            .replace(/\b(\d+)\s*(months|месяцев|месяца|месяц)\b/ig, '$1 oy kafolat')
            .trim();
        qoshimchaMaul = translateToUzbek(qoshimchaMaul);
    }
    
    // 18. Rang nomi
    let rangNomi = richItem.color || raw.color || raw.Color;
    
    // Map values back to parameters
    const mapped = { ...item.parameters };
    
    // Only assign if not null
    mapped["Quvvat, Vt"] = quvvat || null;
    mapped["Piyola materiali"] = piyola || null;
    mapped["Filtr uchun rang"] = rang || null;
    mapped["Tezlik soni"] = tezlik || null;
    mapped["Qo'shimcha funktsiyalar"] = qoshimchaFunk || null;
    mapped["Qo'shimchalar"] = qoshimchalar || null;
    mapped["Ko'za hajmi, l"] = koza || null;
    mapped["Maydalagichning sig'imi, l"] = maydalagich || null;
    mapped["Dizayn xususiyatlari"] = dizayn || null;
    mapped["Control"] = control || null;
    mapped["Rejimlar"] = rejimlar || null;
    mapped["O'lchov stakanining hajmi, l"] = olchovStakan || null;
    mapped["Korpus materiali"] = korpus || null;
    mapped["Tarmoq simining uzunligi, m"] = sim || null;
    mapped["Og'irligi, kg"] = ogirlik || null;
    mapped["Qo'shimcha ma'lumot"] = qoshimchaMaul || null;
    mapped["Ishlab chiqaruvchidan rang nomi"] = rangNomi || null;
    
    // Immersion part (only for hand blenders)
    if (item.category_key === 'hand_blenders') {
        mapped["Material immersion qism"] = immersion || null;
    }
    
    return mapped;
}

async function run() {
    console.log("=== Running parameters mapping script ===");
    
    const rich = JSON.parse(fs.readFileSync(richPath, 'utf8'));
    
    // 1. Process stationary
    if (fs.existsSync(stationaryPath)) {
        const statData = JSON.parse(fs.readFileSync(stationaryPath, 'utf8'));
        const ids = Object.keys(statData);
        let filledCount = 0;
        
        ids.forEach(id => {
            const richItem = rich[id];
            if (richItem) {
                statData[id].parameters = mapItem(statData[id], richItem);
                filledCount++;
            }
        });
        
        fs.writeFileSync(stationaryPath, JSON.stringify(statData, null, 2), 'utf8');
        console.log(`- Mapped parameters for ${filledCount} stationary blenders.`);
    }
    
    // 2. Process hand blenders
    if (fs.existsSync(handPath)) {
        const handData = JSON.parse(fs.readFileSync(handPath, 'utf8'));
        const ids = Object.keys(handData);
        let filledCount = 0;
        
        ids.forEach(id => {
            const richItem = rich[id];
            if (richItem) {
                handData[id].parameters = mapItem(handData[id], richItem);
                filledCount++;
            }
        });
        
        fs.writeFileSync(handPath, JSON.stringify(handData, null, 2), 'utf8');
        console.log(`- Mapped parameters for ${filledCount} hand blenders.`);
    }
    
    console.log("Mapping complete!");
}

run();
