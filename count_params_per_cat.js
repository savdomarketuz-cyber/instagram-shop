const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const dir = 'D:\\\\Desktop\\\\yangi mahsulotlar';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.includes('tayyor'));

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

const results = [];

files.forEach(f => {
  const wb = xlsx.readFile(path.join(dir, f));
  const sheetName = wb.SheetNames[2];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});
  
  // Get category name from first row
  const categoryName = data[0] ? data[0][0] : 'Unknown';
  
  let headerRowIndex = -1;
  for(let i=0; i<10; i++) {
    if(data[i] && data[i].includes('Mahsulot nomi *')) { headerRowIndex = i; break; }
  }
  
  if(headerRowIndex > -1) {
    const headers = data[headerRowIndex];
    const paramNames = [];
    headers.forEach((h) => {
      if(h && !standardCols.includes(h.trim())) paramNames.push(h.trim());
    });
    
    // Count how many products and avg filled params
    const nameIdx = headers.indexOf('Mahsulot nomi *');
    let productCount = 0;
    let totalFilled = 0;
    
    for(let i=headerRowIndex+2; i<data.length; i++) {
      const row = data[i];
      if(!row || row.length === 0 || !row[nameIdx]) continue;
      if(row[nameIdx].includes('Agar bir nechta')) continue;
      productCount++;
      
      let filled = 0;
      paramNames.forEach(pn => {
        const idx = headers.indexOf(pn);
        if(row[idx] !== undefined && row[idx] !== null && row[idx] !== '') filled++;
      });
      totalFilled += filled;
    }
    
    results.push({
      file: f,
      category: categoryName,
      totalParams: paramNames.length,
      paramNames: paramNames,
      productCount: productCount,
      avgFilledPerProduct: productCount > 0 ? (totalFilled / productCount).toFixed(1) : 0
    });
  }
});

results.forEach(r => {
  console.log('\n=== ' + r.category + ' ===');
  console.log('Fayl: ' + r.file);
  console.log('Jami parametrlar soni: ' + r.totalParams);
  console.log('Mahsulotlar soni: ' + r.productCount);
  console.log('Har bir mahsulotda o\'rtacha to\'ldirilgan: ' + r.avgFilledPerProduct + ' / ' + r.totalParams);
  console.log('Parametrlar ro\'yxati:');
  r.paramNames.forEach((p, i) => console.log('  ' + (i+1) + '. ' + p));
});
