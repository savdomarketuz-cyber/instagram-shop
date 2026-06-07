const xlsx = require('xlsx');
const wb = xlsx.readFile('D:\\\\Desktop\\\\yangi mahsulotlar\\\\mass_business_content_template_216615282_07-06-2026(1).xlsx');
const sheet = wb.Sheets[wb.SheetNames[2]];
const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
let hIdx = -1;
for(let i=0; i<10; i++) {
    if(data[i] && data[i].includes('Mahsulot nomi *')) {
        hIdx = i;
        break;
    }
}
const headers = data[hIdx];
const row = data[hIdx+3];
headers.forEach((h, i) => {
    if(row[i]) {
        let val = String(row[i]);
        if(val.length > 50) val = val.substring(0, 50) + '...';
        console.log(`[${i}] ${h}: ${val}`);
    }
});
