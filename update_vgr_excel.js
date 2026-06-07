const xlsx = require('xlsx');

const filePath = 'D:\\Desktop\\velari narx\\extracted_products.xlsx';

const targetModels = [
  'V-413', 'V-414', 'V-487', 'V-488', 'V-491', 'V-492', 'V-493', 'V-496', 'V-498', 'V-509', 
  'V-528', 'V-590', 'V-595', 'V-597', 'V-700', 'V-703', 'V-706', 'V-722', 'V-727', 'V-728', 
  'V-732', 'V-733', 'V-738', 'V-739', 'V-751', 'V-753', 'V-756', 'V-758', 'V-759', 'V-760'
];

function updateExcel() {
    console.log('Reading Excel file...');
    const wb = xlsx.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    
    // Read as 2D array
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length === 0) {
        return console.log('Excel file is empty.');
    }
    
    const headers = data[0];
    let modelColIdx = -1;
    for (let i = 0; i < headers.length; i++) {
        if (headers[i] && String(headers[i]).trim().toLowerCase() === 'model') {
            modelColIdx = i;
            break;
        }
    }
    
    // If we can't find a 'Model' column, let's just search the whole row
    let updatedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        let rowModel = '';
        if (modelColIdx !== -1 && row[modelColIdx]) {
            rowModel = String(row[modelColIdx]).trim();
        } else {
            // Fallback: Check if any cell in the row matches exactly one of the target models
            for (let j = 0; j < row.length; j++) {
                if (row[j] && targetModels.includes(String(row[j]).trim())) {
                    rowModel = String(row[j]).trim();
                    break;
                }
            }
        }
        
        // Normalize model to check (remove prefixes if needed, but our targetModels are exact)
        // Also check if rowModel starts with or contains the exact model
        const matched = targetModels.find(m => rowModel.includes(m));
        
        if (matched) {
            // Write 'cd' to Column G (index 6)
            row[6] = 'cd';
            updatedCount++;
        }
    }
    
    console.log(`Matched and updated ${updatedCount} rows.`);
    
    // Convert back to sheet and save
    const newSheet = xlsx.utils.aoa_to_sheet(data);
    wb.Sheets[sheetName] = newSheet;
    
    console.log('Saving Excel file...');
    xlsx.writeFile(wb, filePath);
    console.log('Done!');
}

updateExcel();
