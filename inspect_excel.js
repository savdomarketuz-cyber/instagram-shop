const xlsx = require('xlsx'); 
const fs = require('fs');
const files = fs.readdirSync('D:/Desktop/Yangi jild/').filter(f => f.endsWith('.xlsx'));
const wb = xlsx.readFile('D:/Desktop/Yangi jild/' + files[1]); // Trying second file just in case
const data = xlsx.utils.sheet_to_json(wb.Sheets["Mahsulot ma'lumotlari"], {header: 1});

console.log('File:', files[1]);
console.log('Total rows in sheet:', data.length);

for(let i=0; i<Math.min(data.length, 50); i++) {
  const row = data[i];
  if(!row || row.length === 0) continue;
  
  let cells = row.map(c => String(c||'').substring(0, 30)).filter(c => c.length > 0);
  if(cells.length > 0) {
      console.log('Row ' + i + ' (length ' + row.length + ') ->', cells.slice(0, 5));
  }
}
