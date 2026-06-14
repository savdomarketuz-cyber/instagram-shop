const xlsx = require('xlsx'); 
const fs = require('fs');

const wb = xlsx.readFile('D:/Desktop/yangi mahsulotlar/mahsulotlar_export_2026-06-08_fixed.xlsx'); 
const sheetName = wb.SheetNames[0]; 
const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1}); 

const headers = ['Qo\'shimcha qismlar (Вложения)', 'Lampa turi (Тип лампы)', 'Rejimlar (Режимы)', 'Resurs (Ресурс вспышек)', 'Intensivlik darajasi (Уровни)', 'Qo\'shimcha funksiyalar (Доп)'];
headers.forEach((h, idx) => {
  data[0][29 + idx] = h;
});

for(let i=1; i<data.length; i++) {
  const descUz = (data[i][20] || '').toLowerCase();
  const descRu = (data[i][22] || '').toLowerCase();
  const combined = descUz + ' ' + descRu;
  
  // Vlojeniya
  let vlojeniya = [];
  if(combined.includes('очки') || combined.includes("ko'zoynak")) vlojeniya.push("Himoya ko'zoynagi");
  if(combined.includes('бритва') || combined.includes("ustara")) vlojeniya.push("Ustara");
  if(combined.includes('насадка') || combined.includes("nasadka")) vlojeniya.push("Maxsus nasadkalar");
  if(combined.includes('катридж') || combined.includes('картридж') || combined.includes("katridj")) vlojeniya.push("Zaxira katridj");
  
  // Lampa turi
  let lampa = '-';
  if(combined.includes('ксеноновая') || combined.includes('кварцевая')) lampa = 'Ksenon kvartsli lampa';
  else if(combined.includes('ipl')) lampa = 'IPL texnologiyasi';
  
  // Rejimlar
  let rejim = '-';
  if(combined.includes('скольжения') || combined.includes('glide')) rejim = 'Sirpanish (Glide) rejimi';
  
  // Resurs
  let resurs = '-';
  if(combined.includes('600,000') || combined.includes('600000') || combined.includes('600 000')) resurs = '600,000+ chaqnash';
  else if(combined.includes('рекордным ресурс') || combined.includes('большим ресурс')) resurs = 'Katta hajmda';
  
  // Intensivlik
  let intensivlik = '-';
  if(combined.match(/7 уровней/i) || combined.match(/7 ta/i)) intensivlik = '7 ta daraja';
  if(combined.match(/20 дж/i)) intensivlik = '20 J gacha';
  
  // Qo'shimcha funksiyalar
  let qoshimcha = [];
  if(combined.includes('охлажден') || combined.includes('sovutish')) qoshimcha.push('Sovutish tizimi');
  if(combined.includes('sr') || combined.includes('ac')) qoshimcha.push('SR va AC (Yuz parvarishi)');
  if(combined.includes('акне') || combined.includes('akne')) qoshimcha.push('Akne davolash');
  
  data[i][29] = vlojeniya.length > 0 ? vlojeniya.join(', ') : '-';
  data[i][30] = lampa;
  data[i][31] = rejim;
  data[i][32] = resurs;
  data[i][33] = intensivlik;
  data[i][34] = qoshimcha.length > 0 ? qoshimcha.join(', ') : '-';
}

const newSheet = xlsx.utils.aoa_to_sheet(data);
wb.Sheets[sheetName] = newSheet;
xlsx.writeFile(wb, 'D:/Desktop/yangi mahsulotlar/mahsulotlar_export_2026-06-08_params_columns.xlsx');
console.log('Done!');
