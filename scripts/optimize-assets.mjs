import sharp from 'sharp';
import { writeFileSync, statSync } from 'fs';
import { join } from 'path';

const PUBLIC = 'D:/Desktop/asosiy dasturlar/instagram shop/public';

async function main() {
  console.log('🎨 Asset optimizatsiyasi boshlandi\n');

  const logoBuf = await sharp(join(PUBLIC, 'logo.png')).toBuffer();
  const origSize = (statSync(join(PUBLIC, 'logo.png')).size / 1024).toFixed(1);
  console.log(`Asl logo.png: ${origSize}KB\n`);

  // 1. favicon.ico (multi-size PNG, brauzer sprint qiladi)
  const fav32 = await sharp(logoBuf)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, 'favicon.ico'), fav32);
  console.log(`✓ favicon.ico → ${(fav32.length / 1024).toFixed(1)}KB`);

  // Apple touch icon (180x180)
  const apple180 = await sharp(logoBuf)
    .resize(180, 180, { fit: 'contain', background: { r: 0xfa, g: 0xfa, b: 0xf6 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), apple180);
  console.log(`✓ apple-touch-icon.png → ${(apple180.length / 1024).toFixed(1)}KB`);

  // 2. og-image: 1200×630 (social card)
  const og = await sharp(logoBuf)
    .resize(1200, 630, {
      fit: 'contain',
      background: { r: 0xfa, g: 0xfa, b: 0xf6 },
    })
    .png({ quality: 80, compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, 'og-image.png'), og);
  console.log(`✓ og-image.png → ${(og.length / 1024).toFixed(1)}KB`);

  // 3. logo.png — to'g'ri o'lchamda optimallashtirish (256×256 yetadi)
  const logoOpt = await sharp(logoBuf)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, 'logo.png'), logoOpt);
  console.log(`✓ logo.png → ${(logoOpt.length / 1024).toFixed(1)}KB`);

  console.log(`\n✅ Tejaldi: ${((parseFloat(origSize) * 3) - ((fav32.length + apple180.length + og.length + logoOpt.length) / 1024)).toFixed(1)}KB`);
}

main().catch(e => { console.error(e); process.exit(1); });
