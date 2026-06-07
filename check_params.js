const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const dir = 'D:\\\\Desktop\\\\yangi mahsulotlar';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.includes('tayyor'));
let paramStats = { excellent: 0, good: 0, average: 0, poor: 0 };
let totalParamsChecked = 0;
let totalFilledParams = 0;

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
  'Дата дополнения карточки', 'Boshqa xususiyatlar', 'PARAM_NAMES', 'PARAM_IDS'
];

files.forEach(f => {
  const wb = xlsx.readFile(path.join(dir, f));
  const sheetName = wb.SheetNames[2];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});
  
  let headerRowIndex = -1;
  for(let i=0; i<10; i++) {
    if(data[i] && data[i].includes('Mahsulot nomi *')) { headerRowIndex = i; break; }
  }
  if(headerRowIndex > -1) {
    const headers = data[headerRowIndex];
    const paramIndices = [];
    headers.forEach((h, idx) => {
      if(h && !standardCols.includes(h.trim())) paramIndices.push(idx);
    });
    
    for(let i=headerRowIndex+2; i<data.length; i++) {
      const row = data[i];
      if(!row || row.length === 0 || !row[headers.indexOf('Mahsulot nomi *')]) continue;
      if(row[headers.indexOf('Mahsulot nomi *')].includes('Agar bir nechta')) continue;
      
      let filled = 0;
      paramIndices.forEach(idx => {
        if(row[idx] !== undefined && row[idx] !== null && row[idx] !== '') filled++;
      });
      
      const totalParams = paramIndices.length;
      if(totalParams === 0) continue;
      
      const percent = (filled / totalParams) * 100;
      totalParamsChecked += totalParams;
      totalFilledParams += filled;
      
      if(percent >= 80) paramStats.excellent++;
      else if(percent >= 50) paramStats.good++;
      else if(percent >= 20) paramStats.average++;
      else paramStats.poor++;
    }
  }
});

console.log(JSON.stringify({paramStats, totalParamsChecked, totalFilledParams, avgPercent: (totalFilledParams/totalParamsChecked*100).toFixed(1) + '%' }, null, 2));
