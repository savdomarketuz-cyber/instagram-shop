const fs = require('fs');
const path = require('path');

class Exporter {
  /**
   * JSON faylga saqlash
   */
  static saveToJson(data, filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  /**
   * CSV formatiga o'tkazish va saqlash
   */
  static saveToCsv(items, filePath) {
    if (!items || items.length === 0) return null;

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const headers = Object.keys(items[0]);
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(','),
      ...items.map(row => headers.map(h => escapeCsv(row[h])).join(','))
    ].join('\n');

    fs.writeFileSync(filePath, '\uFEFF' + csvContent, 'utf-8'); // BOM for Excel UTF-8 support
    return filePath;
  }
}

module.exports = Exporter;
