const fs = require('fs');
const path = require('path');

const catIds = ['406', '401', '403', '404', '402', '1780990168256771', '405', '303', '1785864351977'];
let totalProds = 0;
let totalMatched = 0;

console.log('\n================ BARCHA TOIFALAR NATIJALARI ================');
catIds.forEach((id, idx) => {
  const f = path.join(__dirname, `category_${id}_results.json`);
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    const matched = data.results.filter(r => r.source === 'UZUM_EXACT').length;
    const generated = data.results.length - matched;
    totalProds += data.results.length;
    totalMatched += matched;
    console.log(`${idx + 1}. [${data.cat.name}] — Jami: ${data.results.length} ta (Uzum: ${matched}, Standart: ${generated})`);
  }
});
console.log('============================================================');
console.log(`JAMI MAHSULOTLAR: ${totalProds} ta`);
console.log(`Uzumdan aniq topilgan: ${totalMatched} ta`);
console.log(`Uzum standarti asosida generatsiya: ${totalProds - totalMatched} ta`);
console.log('============================================================\n');
