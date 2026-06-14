const fs = require('fs');

const stationaryFile = 'D:/Desktop/uzum yangi mahsulotlar/categories/blenders_stationary.json';
const stationary = JSON.parse(fs.readFileSync(stationaryFile, 'utf-8'));

const firstId = Object.keys(stationary)[0];
const firstProd = stationary[firstId];

console.log(`=== First Product ID: ${firstId} ===`);
console.log(JSON.stringify(firstProd, null, 2));
