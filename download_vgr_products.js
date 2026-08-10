const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BASE_DIR = path.join(__dirname, 'vgr_mahsulotlari');

function sanitizeFilename(str) {
  if (!str) return 'unknown';
  return str
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download image, status code: ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout downloading image'));
    });
  });
}

async function run() {
  console.log('Fetching VGR brand products from database...');

  const { data: bData } = await supabase.from('brands').select('id').ilike('name', 'vgr');
  const bIds = bData ? bData.map(b => b.id) : [];

  const { data: p1 } = await supabase.from('products').select('*').in('brand_id', bIds).eq('is_deleted', false);
  const { data: p2 } = await supabase.from('products').select('*').ilike('name', '%vgr%').eq('is_deleted', false);

  const map = new Map();
  [...(p1 || []), ...(p2 || [])].forEach(p => map.set(p.id, p));
  const products = Array.from(map.values());

  console.log(`Found ${products.length} VGR products.`);

  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  }

  let successCount = 0;
  let totalImagesDownloaded = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const indexStr = String(i + 1).padStart(3, '0');
    const skuClean = sanitizeFilename(p.sku || p.model || 'NO_SKU');
    const nameClean = sanitizeFilename(p.name_uz || p.name || 'Mahsulot');
    
    const folderName = `${indexStr}_${skuClean}_${nameClean}`;
    const productDir = path.join(BASE_DIR, folderName);

    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }

    // Format txt content
    const name = p.name_uz || p.name || 'Noma\'lum';
    const price = p.price ? Number(p.price).toLocaleString('uz-UZ') + " so'm" : "Ko'rsatilmadi";
    const oldPrice = p.old_price && p.old_price > 0 ? Number(p.old_price).toLocaleString('uz-UZ') + " so'm" : null;
    const desc = p.description_uz || p.description || 'Tavsif yo\'q';
    const sku = p.sku || 'Mavjud emas';
    const model = p.model || 'Mavjud emas';

    let txtContent = `=========================================\n`;
    txtContent += `MAHSULOT NOMI: ${name}\n`;
    txtContent += `=========================================\n\n`;
    txtContent += `SOTUV NARXI (AMALDAGI): ${price}\n`;
    if (oldPrice) {
      txtContent += `ESKI NARXI: ${oldPrice}\n`;
    }
    txtContent += `ARTIKUL / SKU: ${sku}\n`;
    txtContent += `MODEL: ${model}\n`;
    txtContent += `ID: ${p.id}\n\n`;
    txtContent += `-----------------------------------------\n`;
    txtContent += `TAVSIFI:\n`;
    txtContent += `-----------------------------------------\n`;
    txtContent += `${desc}\n`;

    fs.writeFileSync(path.join(productDir, 'mahsulot_haqida.txt'), txtContent, 'utf-8');

    // Gather unique images
    const imageList = [];
    if (p.image) imageList.push(p.image);
    if (Array.isArray(p.images)) {
      p.images.forEach(imgUrl => {
        if (imgUrl && !imageList.includes(imgUrl)) {
          imageList.push(imgUrl);
        }
      });
    }

    // Download images
    for (let imgIdx = 0; imgIdx < imageList.length; imgIdx++) {
      const imgUrl = imageList[imgIdx];
      let ext = '.jpg';
      if (imgUrl.includes('.png')) ext = '.png';
      else if (imgUrl.includes('.webp')) ext = '.webp';
      else if (imgUrl.includes('.jpeg')) ext = '.jpeg';

      const imgName = imgIdx === 0 ? `asosiy_rasm${ext}` : `rasm_${imgIdx + 1}${ext}`;
      const imgPath = path.join(productDir, imgName);

      try {
        await downloadImage(imgUrl, imgPath);
        totalImagesDownloaded++;
      } catch (err) {
        console.warn(`[WARN] Product ${p.sku} image ${imgIdx + 1} failed: ${err.message}`);
      }
    }

    successCount++;
    if (successCount % 10 === 0 || successCount === products.length) {
      console.log(`Processed ${successCount}/${products.length} products...`);
    }
  }

  console.log(`\n🎉 COMPLETED! Successfully created folders for ${successCount} products.`);
  console.log(`Total images downloaded: ${totalImagesDownloaded}`);
  console.log(`Saved location: ${BASE_DIR}`);
}

run().catch(err => {
  console.error('Fatal error:', err);
});
