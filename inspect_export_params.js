const xlsx = require('xlsx');
const path = require('path');

const filePath = 'D:\\Desktop\\yangi mahsulotlar\\mahsulotlar_export_2026-06-08_with_params.xlsx';

async function run() {
    console.log(`=== Inspecting ${path.basename(filePath)} ===`);
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
    
    console.log(`Total rows: ${data.length}`);
    console.log(`Row 1:`, data[0] ? data[0].slice(0, 10) : 'empty');
    console.log(`Row 2:`, data[1] ? data[1].slice(0, 10) : 'empty');
    console.log(`Row 3:`, data[2] ? data[2].slice(0, 10) : 'empty');
    
    // Find headers row
    let headerRowIndex = -1;
    for(let i=0; i<15; i++) {
        if(data[i] && data[i].includes('Mahsulot nomi *')) { 
            headerRowIndex = i; 
            break; 
        }
    }
    
    if (headerRowIndex > -1) {
        console.log(`Headers found at row index: ${headerRowIndex}`);
        const headers = data[headerRowIndex];
        console.log(`Headers:`, headers.slice(0, 20));
        
        // Find if there are other columns beyond standard cols
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
        
        const extraCols = [];
        headers.forEach(h => {
            if (h && !standardCols.includes(h.trim())) {
                extraCols.push(h.trim());
            }
        });
        console.log(`Extra columns (${extraCols.length}):`, extraCols);
        
        // Check first 5 data rows
        console.log(`\nSample data rows:`);
        for (let i = headerRowIndex + 1; i < headerRowIndex + 6 && i < data.length; i++) {
            const row = data[i];
            if (row) {
                console.log(`Row ${i}: SKU: ${row[headers.indexOf('Sizning SKU *')]} | Name: ${row[headers.indexOf('Mahsulot nomi *')]}`);
            }
        }
    } else {
        console.log("Could not find header row with 'Mahsulot nomi *'");
    }
}

run();
