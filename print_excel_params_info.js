const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'D:\\Desktop\\Yangi jild';
const standardCols = [
  'Sizning SKU *', 'Muhim xatolar', "Tanqidiy bo'lmagan xatolar", 'Kartaning sifati',
  "To'ldirish bo'yicha tavsiyalar", 'Variantlar guruhining nomi', 'Mahsulot nomi *',
  'Rasmga havola *', 'Eskiz uchun rasm', 'Mahsulot tavsifi *', 'Brend *', 'Shtrixkod *',
  'Teglar', 'Video havolasi', 'Narxi *', 'Chizilgan narx', 'Narxi', "Ko'rsatmalar",
  'Ishlab chiqarilgan mamlakat', 'Ishlab chiqaruvchining maqolasi', 'Ishlab chiqaruvchi',
  'Paket bilan vazn, kg', "Paket bilan o'lchamlari, sm", 'Mahsulot bir nechta joyni egallaydi',
  "Qo'shimcha xarajatlar", 'Yaroqlilik muddati', 'Yaroqlilik muddati haqida sharh',
  'Xizmat muddati', 'Xizmat muddati haqida sharh', 'Kafolat muddati', 'Kafolat muddati haqida sharh',
  'Mahsulot uchun hujjat raqami', 'Tn VED kodi', 'Belgilash turi', "Mahsulot ko'rinishi",
  'Mahsulot holatining tavsifi', 'Bozordagi SKU', 'CSKU на Маркете', 'Arxivda', 'Turi',
  'Дата дополнения карточки', 'Boshqa xususiyatlar', 'PARAM_NAMES', 'PARAM_IDS',
  'Etkazib berish opsiyasi', 'Kiritilgan', 'Batafsil uskunalar',
  'Mahsulotdagi paketlar soni, dona', 'Versiya',
  'Uzunlik, mm', 'Kengligi, mm', 'Balandligi, mm', "Og'irligi, g"
];

const targetFiles = [
    { name: 'mass_business_content_template_216615303_09-06-2026(10).xlsx', cat: 'Statsionar blenderlar' },
    { name: 'mass_business_content_template_216615303_09-06-2026(20).xlsx', cat: 'Portativ blenderlar' },
    { name: 'mass_business_content_template_216615303_09-06-2026.xlsx', cat: 'Immersion blenders' }
];

async function run() {
    console.log("=== Blender Category Excel Parameter Analysis ===");
    
    for (const tf of targetFiles) {
        const fullPath = path.join(dir, tf.name);
        if (!fs.existsSync(fullPath)) {
            console.log(`File does not exist: ${tf.name}`);
            continue;
        }
        
        console.log(`\n------------------------------------------------`);
        console.log(`File: ${tf.name}`);
        console.log(`Category: ${tf.cat}`);
        
        const wb = xlsx.readFile(fullPath);
        const sheetName = wb.SheetNames[2];
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
        
        let headerRowIndex = -1;
        for(let i=0; i<10; i++) {
            if(data[i] && data[i].includes('Mahsulot nomi *')) { 
                headerRowIndex = i; 
                break; 
            }
        }
        
        if (headerRowIndex > -1) {
            const headers = data[headerRowIndex];
            const paramNames = [];
            headers.forEach(h => {
                if (h && !standardCols.includes(h.trim())) {
                    paramNames.push(h.trim());
                }
            });
            console.log(`Found ${paramNames.length} custom parameters:`);
            paramNames.forEach((pn, idx) => {
                console.log(`  ${idx + 1}. ${pn}`);
            });
            
            // Check if there are any products listed in this file
            const nameIdx = headers.indexOf('Mahsulot nomi *');
            let productCount = 0;
            for(let i=headerRowIndex+2; i<data.length; i++) {
                const row = data[i];
                if(row && row[nameIdx] && !row[nameIdx].includes('Agar bir nechta') && !row[nameIdx].includes('Sxemaga e\'tibor')) {
                    productCount++;
                }
            }
            console.log(`Products in Excel sheet: ${productCount}`);
        } else {
            console.log("Could not find header row with 'Mahsulot nomi *'");
        }
    }
}

run();
