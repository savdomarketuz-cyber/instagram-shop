const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const htmlContent = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Kafolat Taloni - #100000000000083</title>
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  body {
    background-color: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0;
    padding: 0;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page-container {
    width: 210mm;
    height: 297mm;
    box-sizing: border-box;
    padding: 24mm 20mm;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #ffffff;
  }
  .frame-border {
    position: absolute;
    top: 10mm;
    left: 10mm;
    right: 10mm;
    bottom: 10mm;
    border: 2px solid #0d9488;
    border-radius: 6px;
    pointer-events: none;
  }
  .frame-inner {
    position: absolute;
    top: 12mm;
    left: 12mm;
    right: 12mm;
    bottom: 12mm;
    border: 1px solid #99f6e4;
    border-radius: 4px;
    pointer-events: none;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0d9488;
    padding-bottom: 15px;
  }
  .brand-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 1.5px;
    color: #0f766e;
    text-transform: uppercase;
  }
  .brand-sub {
    font-size: 12px;
    color: #475569;
    margin-top: 4px;
    font-weight: 500;
  }
  .doc-info {
    text-align: right;
  }
  .doc-title {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0.5px;
  }
  .doc-sub {
    font-size: 12px;
    font-weight: 600;
    color: #0d9488;
    margin-top: 3px;
  }
  .badge-status {
    display: inline-block;
    background: #ccfbf1;
    color: #0f766e;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    margin-top: 5px;
    border: 1px solid #5eead4;
  }

  .grid-two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 18px;
  }
  .card-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 14px 16px;
  }
  .card-title {
    font-size: 12px;
    font-weight: 700;
    color: #0f766e;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 5px;
  }
  .data-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 7px;
    line-height: 1.4;
  }
  .data-row:last-child {
    margin-bottom: 0;
  }
  .data-label {
    color: #64748b;
    font-weight: 500;
  }
  .data-val {
    color: #0f172a;
    font-weight: 600;
    text-align: right;
    max-width: 62%;
  }

  .table-box {
    margin-top: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  .data-table th {
    background: #0d9488;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 9px 12px;
    text-align: left;
  }
  .data-table td {
    padding: 12px;
    font-size: 12px;
    border-bottom: 1px solid #f1f5f9;
    background: #ffffff;
  }
  .prod-name {
    font-weight: 700;
    color: #0f172a;
    font-size: 13px;
  }
  .prod-desc {
    color: #64748b;
    font-size: 11px;
    margin-top: 2px;
  }

  .warranty-banner {
    margin-top: 16px;
    background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
    color: #ffffff;
    border-radius: 6px;
    padding: 12px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .banner-left h3 {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .banner-left p {
    font-size: 11px;
    color: #ccfbf1;
    margin-top: 2px;
  }
  .banner-badge {
    background: #ffffff;
    color: #0f766e;
    font-size: 15px;
    font-weight: 900;
    padding: 6px 14px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }

  .terms-card {
    margin-top: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 14px 16px;
  }
  .terms-title {
    font-size: 12px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .terms-ol {
    padding-left: 18px;
    font-size: 11.5px;
    color: #334155;
    line-height: 1.55;
  }
  .terms-ol li {
    margin-bottom: 5px;
  }
  .terms-ul {
    margin-top: 4px;
    padding-left: 16px;
  }
  .terms-ul li {
    margin-bottom: 3px;
    color: #475569;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
  }
  .seller-details {
    font-size: 11px;
    color: #475569;
    line-height: 1.6;
  }
  .seller-details strong {
    color: #0f172a;
    font-size: 12px;
  }

  .stamp-box {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stamp {
    width: 110px;
    height: 110px;
    border: 2px solid #0d9488;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #0f766e;
    transform: rotate(-10deg);
    background: rgba(13, 148, 136, 0.05);
  }
  .stamp-inner {
    width: 92px;
    height: 92px;
    border: 1px dashed #0d9488;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px;
  }
  .stamp-text-1 {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.8px;
  }
  .stamp-text-2 {
    font-size: 9px;
    font-weight: 800;
    color: #0f766e;
    border-top: 1px solid #0d9488;
    border-bottom: 1px solid #0d9488;
    padding: 1px 4px;
    margin: 3px 0;
  }
  .stamp-text-3 {
    font-size: 7px;
    color: #64748b;
  }

  .legal-note {
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    margin-top: 10px;
  }
</style>
</head>
<body>

<div class="page-container">
  <div class="frame-border"></div>
  <div class="frame-inner"></div>

  <!-- MAIN BODY -->
  <div>
    <!-- HEADER -->
    <div class="header">
      <div>
        <div class="brand-title">VELARI.UZ</div>
        <div class="brand-sub">Rasmiy Internet Do'koni & Servis Markazi</div>
      </div>
      <div class="doc-info">
        <div class="doc-title">KAFOLAT TALONI</div>
        <div class="doc-sub">WARRANTY CERTIFICATE</div>
        <div class="badge-status">&#10003; TASDIQLANGAN / VERIFIED</div>
      </div>
    </div>

    <!-- DETAILS -->
    <div class="grid-two">
      <!-- BUYURTMA -->
      <div class="card-box">
        <div class="card-title">Buyurtma va Mijoz Ma'lumotlari</div>
        <div class="data-row">
          <span class="data-label">Buyurtma raqami:</span>
          <span class="data-val">#100000000000083</span>
        </div>
        <div class="data-row">
          <span class="data-label">Sotilgan sana:</span>
          <span class="data-val">09.09.2026</span>
        </div>
        <div class="data-row">
          <span class="data-label">Xaridor telefoni:</span>
          <span class="data-val">+998 99 075 93 05</span>
        </div>
        <div class="data-row">
          <span class="data-label">Yetkazish manzili:</span>
          <span class="data-val">Uchtepa t., Chilonzor G9A, Toshkent</span>
        </div>
        <div class="data-row">
          <span class="data-label">To'lov holati:</span>
          <span class="data-val" style="color:#0f766e;">Qabul qilindi (Naqd)</span>
        </div>
      </div>

      <!-- SOTUVCHI -->
      <div class="card-box">
        <div class="card-title">Sotuvchi va Xizmat Markazi</div>
        <div class="data-row">
          <span class="data-label">Sotuvchi:</span>
          <span class="data-val">"Velari uz" internet do'koni</span>
        </div>
        <div class="data-row">
          <span class="data-label">Aloqa markazi:</span>
          <span class="data-val">+998 (95) 082 11 88</span>
        </div>
        <div class="data-row">
          <span class="data-label">Sayt:</span>
          <span class="data-val">velari.uz</span>
        </div>
        <div class="data-row">
          <span class="data-label">Xizmat turi:</span>
          <span class="data-val">Bepul kafolatli servis</span>
        </div>
        <div class="data-row">
          <span class="data-label">Buyurtma holati:</span>
          <span class="data-val" style="color:#0f766e;">Yetkazib berilgan</span>
        </div>
      </div>
    </div>

    <!-- PRODUCT TABLE -->
    <div class="table-box">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50%;">Mahsulot nomi va tavsifi</th>
            <th style="width: 20%;">Model / SKU</th>
            <th style="width: 12%; text-align:center;">Soni</th>
            <th style="width: 18%; text-align:right;">Qiymati</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="prod-name">Babyverse SE8 lazerni epilyator</div>
              <div class="prod-desc">Professional fotoepilyator va lazerli depilyatsiya vositasi</div>
            </td>
            <td><strong>SE8 / BV-SE8</strong></td>
            <td style="text-align:center;">1 dona</td>
            <td style="text-align:right;"><strong>1 044 050 so'm</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- BANNER -->
    <div class="warranty-banner">
      <div class="banner-left">
        <h3>RASMIY KAFOLAT MUDDATI: 6 OY</h3>
        <p>Amal qilish davri: 09.09.2026 dan 09.03.2027 gacha</p>
      </div>
      <div class="banner-badge">6 OY KAFOLAT</div>
    </div>

    <!-- TERMS -->
    <div class="terms-card">
      <div class="terms-title">KAFOLAT SHARTLARI VA TALABLARI:</div>
      <ol class="terms-ol">
        <li>Kafolat muddati tovar xaridorga yetkazib berilgan kundan boshlab hisoblanadi.</li>
        <li>Kafolat faqat ishlab chiqaruvchining zavod nuqsonlari (texnik brak) aniqlangan holatlarda bepul ta'mirlash yoki almashtirishni o'z ichiga oladi.</li>
        <li><strong>Quyidagi holatlarda kafolat o'z kuchini yo'qotadi:</strong>
          <ul class="terms-ul">
            <li>Mahsulotga mexanik shikast yetkazilganda (tushib ketish, yorilish, sinish);</li>
            <li>Mahsulot ichiga suv yoki boshqa begona suyuqliklar tushganda;</li>
            <li>Tarmoqdagi elektr tokining me'yordan oshishi natijasida nosozlik yuz berganda;</li>
            <li>Qurilma ruxsatsiz ochilganda yoki mustaqil ta'mirlashga urinilganda.</li>
          </ul>
        </li>
        <li>Kafolat xizmatidan foydalanish uchun ushbu kafolat taloni va buyurtma raqamini taqdim etish lozim.</li>
      </ol>
    </div>
  </div>

  <!-- FOOTER -->
  <div>
    <div class="footer">
      <div class="seller-details">
        <div><strong>"Velari uz" internet do'koni</strong></div>
        <div>Mijozlarni qo'llab-quvvatlash xizmati: +998 (95) 082 11 88</div>
        <div>Toshkent shahri, O'zbekiston</div>
        <div style="margin-top: 4px; font-size: 10px; color: #64748b;">
          Elektron ro'yxatga olish sanasi: 09.09.2026 | Operator: Velari E-Commerce
        </div>
      </div>

      <div class="stamp-box">
        <div class="stamp">
          <div class="stamp-inner">
            <div class="stamp-text-1">VELARI UZ</div>
            <div class="stamp-text-2">6 OY KAFOLAT</div>
            <div class="stamp-text-3">BUYURTMA #100000000000083</div>
          </div>
        </div>
      </div>
    </div>

    <div class="legal-note">
      Mazkur kafolat taloni elektron shaklda yaratilgan bo'lib, O'zbekiston Respublikasining "Iste'molchilarning huquqlarini himoya qilish to'g'risida"gi Qonuniga to'liq mos keladi va yuridik kuchga ega.
    </div>
  </div>
</div>

</body>
</html>
`;

const htmlPath = path.resolve(__dirname, '../public/kafolat_taloni_100000000000083.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML saved to:', htmlPath);

const pdfPath = path.resolve(__dirname, '../public/kafolat_taloni_100000000000083.pdf');
const desktopPdfPath = 'd:\\Desktop\\Kafolat_Taloni_100000000000083.pdf';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
console.log('Generating PDF...');
execSync(cmd);
console.log('PDF generated successfully at:', pdfPath);

try {
  fs.copyFileSync(pdfPath, desktopPdfPath);
  console.log('PDF copied to Desktop at:', desktopPdfPath);
} catch (e) {
  console.log('Could not copy to Desktop, but saved in public folder:', e.message);
}
