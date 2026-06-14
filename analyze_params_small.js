const fs = require('fs');
const xlsx = require('xlsx');

const dir = 'D:/Desktop/Yangi jild/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

const targetSkus = [
    'Sonifer SF-211', 'Sonifer SF-3055', 'UAKEEN ZL-1503', 
    'SONIFER SF-8142', 'UAKEEN PLISOS ZL-930', 'UAKEEN PLISOS ZL-928', 
    'SONIFER SF-2246', 'SONIFER SF-8125', 'Sonifer SF-1908'
].map(s => s.toLowerCase());

files.forEach(f => {
    const wb = xlsx.readFile(dir + f);
    const data = xlsx.utils.sheet_to_json(wb.Sheets["Mahsulot ma'lumotlari"], {header: 1});
    
    data.forEach((row, rowIndex) => {
        if(!row) return;
        
        let rowText = row.join(' ').toLowerCase();
        let foundSku = targetSkus.find(sku => rowText.includes(sku.toLowerCase()));
        
        if(foundSku) {
            console.log(`\n=== 25 ta Exceldan: ${foundSku.toUpperCase()} (${f}) ===`);
            let params = [];
            // Parameters in these sheets are usually Key : Value
            // But from bulk_import.js, it says strings with length > 5, not images, etc.
            // Let's print out what looks like a parameter
            const junkTexts = ["ko'proq ball", "maydon qiymati", "toifaga kiradi", "avtomatik ravishda", "ko'rsatmalarga rioya", "bu har qanday raqam", "sxemaga e'tibor", "havola (url)", "variantni tanlash", "6000 belgidan", "mahsulot filtrga tushishi", "agar bir nechta shtrix-kodlar", "siz vergul bilan", "bu to'g'ridan-to'g'ri", "sizning sku", "mahsulot nomi"];
            
            row.forEach((val, colIdx) => {
                val = String(val).trim();
                if(val && val.length > 3 && !val.includes('http') && val.length < 50) {
                    let isJunk = junkTexts.some(j => val.toLowerCase().includes(j));
                    if(!isJunk) {
                        params.push(`Ustun ${colIdx}: ${val}`);
                    }
                }
            });
            console.log(`Kataklar soni: ${params.length} ta`);
            console.log(params.join('\n'));
        }
    });
});
