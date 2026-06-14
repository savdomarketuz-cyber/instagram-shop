const xlsx = require('xlsx'); 
const wb = xlsx.readFile('D:/Desktop/mass_assortment_business_216615303_08-06-2026.xlsx');
const sheet = wb.Sheets["Mahsulotlar ro'yxati"];
const keys = Object.keys(sheet).filter(k => k[0] !== '!');
console.log('Total cells in sheet:', keys.length);
console.log('Highest row number found:', Math.max(...keys.map(k => parseInt(k.replace(/\D/g, '')) || 0)));
