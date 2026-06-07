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
  'Дата дополнения карточки', 'Boshqa xususiyatlar', 'PARAM_NAMES', 'PARAM_IDS'
];

let totalFilledNow = 0;

const colors = {
  'qora': 'Қора', 'черн': 'Қора', 'black': 'Қора',
  'oq': 'Оқ', 'бел': 'Оқ', 'white': 'Оқ',
  'qizil': 'Қизил', 'красн': 'Қизил', 'red': 'Қизил',
  'kok': 'Кўк', 'син': 'Кўк', 'blue': 'Кўк',
  'yashil': 'Яшил', 'зелен': 'Яшил', 'green': 'Яшил',
  'sariq': 'Сариқ', 'желт': 'Сариқ', 'yellow': 'Сариқ',
  'pushti': 'Пушти', 'розов': 'Пушти', 'pink': 'Пушти',
  'kulrang': 'Кулранг', 'сер': 'Кулранг', 'grey': 'Кулранг', 'gray': 'Кулранг',
  'kumush': 'Кумушrang', 'серебр': 'Кумушrang', 'silver': 'Кумушrang',
  'oltin': 'Олтинrang', 'золот': 'Олтинrang', 'gold': 'Олтинrang'
};

files.forEach(f => {
  const filePath = path.join(dir, f);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[2];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});
  
  let headerRowIndex = -1;
  for(let i=0; i<10; i++) {
    if(data[i] && data[i].includes('Mahsulot nomi *')) { headerRowIndex = i; break; }
  }
  
  if(headerRowIndex > -1) {
    const headers = data[headerRowIndex];
    const paramIndices = {};
    headers.forEach((h, idx) => {
      if(h && !standardCols.includes(h.trim())) paramIndices[h.trim()] = idx;
    });
    
    const nameIdx = headers.indexOf('Mahsulot nomi *');
    const descIdx = headers.indexOf('Mahsulot tavsifi *');
    
    for(let i=headerRowIndex+2; i<data.length; i++) {
      const row = data[i];
      if(!row || row.length === 0 || !row[nameIdx]) continue;
      if(row[nameIdx].includes('Agar bir nechta')) continue;
      
      const textToSearch = ((row[nameIdx] || '') + ' ' + (row[descIdx] || '')).toLowerCase();
      
      const tryFill = (paramName, value) => {
        if(paramIndices[paramName] === undefined) return;
        const idx = paramIndices[paramName];
        if(row[idx] === undefined || row[idx] === null || row[idx] === '') {
          row[idx] = value;
          totalFilledNow++;
        }
      };
      
      const matchPower = textToSearch.match(/(\d{3,4})\s*(w|вт|vatt|watt)/i);
      if(matchPower) tryFill('Soch quritgichining kuchi, Vt', matchPower[1]);
      
      const matchSpeed = textToSearch.match(/(\d)\s*(скорост|tezlik)/i);
      if(matchSpeed) tryFill('Tezlik soni', matchSpeed[1]);
      
      const matchTemp = textToSearch.match(/(\d)\s*(режим|temp)/i);
      if(matchTemp) tryFill('Harorat rejimlari soni', matchTemp[1]);
      
      const matchCord = textToSearch.match(/(\d[\.,]?\d?)\s*(m|м|metr)/i);
      if(matchCord) tryFill('Tarmoq simining uzunligi, m', matchCord[1].replace(',', '.'));
      
      let foundColor = null;
      for(let key in colors) {
        if(textToSearch.includes(key)) {
          foundColor = colors[key];
          break;
        }
      }
      if(foundColor) {
        tryFill('Filtr uchun rang', foundColor);
        tryFill('Ishlab chiqaruvchidan rang nomi', foundColor);
      }
      
      if(textToSearch.includes('холод') || textToSearch.includes('sovuq')) {
        tryFill("Qo'shimcha funktsiyalar", 'Sovuq havo');
      }
    }
    
    wb.Sheets[sheetName] = xlsx.utils.aoa_to_sheet(data);
    xlsx.writeFile(wb, filePath);
  }
});

console.log('Successfully inferred and filled: ' + totalFilledNow + ' parameters.');
