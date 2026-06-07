const xlsx = require('xlsx');

function checkExcel() {
    const wb = xlsx.readFile('D:\\Desktop\\velari narx\\extracted_products.xlsx');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(data.slice(0, 5));
}
checkExcel();
