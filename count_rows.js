const fs = require('fs');
const xlsx = require('xlsx');
const dir = 'D:/Desktop/Yangi jild/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
files.forEach(f => {
  try {
    const wb = xlsx.readFile(dir + f);
    const sheet = wb.Sheets["Mahsulot ma'lumotlari"];
    if(sheet) {
      const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
      console.log(f, 'Rows:', data.length);
    }
  } catch(e) {
    console.error(f, e.message);
  }
});
