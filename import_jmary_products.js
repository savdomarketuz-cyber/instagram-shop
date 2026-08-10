/**
 * Jmary tripod mahsulotlarini saytga joylash skripti
 * 1. Jmary brend yaratish
 * 2. "Shtativlar va tripodlar" kategoriya yaratish (Elektronika ostida)
 * 3. Kategoriya parametrlarini yaratish
 * 4. Rasmlarni Yandex S3 ga yuklash (5 variant: avif, thumb, xs, md, lg + blurDataURL)
 * 5. 4 ta mahsulotni bazaga kiritish
 * 6. Parametr qiymatlarini kiritish
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const sharp = require('sharp');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const YANDEX = {
  ACCESS_KEY: process.env.YANDEX_S3_ACCESS_KEY,
  SECRET_KEY: process.env.YANDEX_S3_SECRET_KEY,
  BUCKET: process.env.YANDEX_S3_BUCKET || 'savdomarketimag',
  REGION: process.env.YANDEX_S3_REGION || 'ru-central1',
};

const HOST = 'storage.yandexcloud.net';

// ─── AWS v4 Signing ─────────────────────────────────────────────────────────
function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}
function sha256hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function uploadToS3(buffer, key, contentType) {
  const { ACCESS_KEY, SECRET_KEY, BUCKET, REGION } = YANDEX;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const headers = {
    'host': HOST,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    'x-amz-date': amzDate,
  };
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join('');
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalRequest = ['PUT', `/${BUCKET}/${key}`, '', canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');

  const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256hex(canonicalRequest)}`;

  const kDate = hmacSha256(`AWS4${SECRET_KEY}`, dateStamp);
  const kRegion = hmacSha256(kDate, REGION);
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = hmacSha256(kSigning, stringToSign).toString('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`https://${HOST}/${BUCKET}/${key}`, {
    method: 'PUT',
    headers: {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'Authorization': authHeader,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`S3 upload failed: ${await res.text()}`);
  return `https://${HOST}/${BUCKET}/${key}`;
}

async function processAndUploadImage(filePath) {
  const srcBuffer = fs.readFileSync(filePath);
  const baseName = path.basename(filePath, path.extname(filePath)).replace(/[^a-zA-Z0-9._-]/g, '_');
  const ts = Date.now();
  const folder = 'uploads';

  const img = sharp(srcBuffer);

  // 1. Blur placeholder (base64)
  const blurBuf = await img.clone()
    .resize(20, 20, { fit: 'cover' })
    .blur(5)
    .toFormat('webp', { quality: 20 })
    .toBuffer();
  const blurDataURL = `data:image/webp;base64,${blurBuf.toString('base64')}`;

  // 2. Main AVIF (1080x1440 inside)
  const avifBuf = await img.clone()
    .resize(1080, 1440, { fit: 'inside', withoutEnlargement: true })
    .toFormat('avif', { quality: 75, effort: 3 })
    .toBuffer();

  // 3. Thumb (360x480 webp)
  const thumbBuf = await img.clone()
    .resize(360, 480, { fit: 'cover' })
    .toFormat('webp', { quality: 40, effort: 6 })
    .toBuffer();

  // 4. xs, md, lg webp variants
  const [xsBuf, mdBuf, lgBuf] = await Promise.all([
    img.clone().resize({ width: 640,  withoutEnlargement: true }).toFormat('webp', { quality: 78, effort: 4 }).toBuffer(),
    img.clone().resize({ width: 828,  withoutEnlargement: true }).toFormat('webp', { quality: 80, effort: 4 }).toBuffer(),
    img.clone().resize({ width: 1080, withoutEnlargement: true }).toFormat('webp', { quality: 82, effort: 4 }).toBuffer(),
  ]);

  console.log(`  Uploading: ${baseName} (avif+thumb+xs+md+lg)...`);

  const [url, lowResUrl, xs, md, lg] = await Promise.all([
    uploadToS3(avifBuf,   `${folder}/${ts}_${baseName}.avif`,      'image/avif'),
    uploadToS3(thumbBuf,  `${folder}/${ts}_${baseName}_thumb.webp`, 'image/webp'),
    uploadToS3(xsBuf,     `${folder}/${ts}_${baseName}_xs.webp`,    'image/webp'),
    uploadToS3(mdBuf,     `${folder}/${ts}_${baseName}_md.webp`,    'image/webp'),
    uploadToS3(lgBuf,     `${folder}/${ts}_${baseName}_lg.webp`,    'image/webp'),
  ]);

  return { url, blurDataURL, lowResUrl, xs, md, lg };
}

async function uploadFolderImages(folderPath) {
  const files = fs.readdirSync(folderPath).filter(f => /\.(webp|jpg|jpeg|png|avif)$/i.test(f)).sort();
  const results = [];
  for (const f of files) {
    const fullPath = path.join(folderPath, f);
    const res = await processAndUploadImage(fullPath);
    results.push(res);
    console.log(`  ✅ ${f} → ${res.url}`);
  }
  return results;
}

// ─── Product definitions ─────────────────────────────────────────────────────

const PRODUCTS_DIR = 'D:/Desktop/instagram shop/new product';

const PRODUCT_DATA = [
  {
    sku: 'JMARY-KP-2205',
    model: 'KP-2205',
    folder: '2205',
    name: 'Jmary KP-2205 Professional Tripod Shtativ Telefon Uchun, 134sm, 360°',
    name_uz: 'Jmary KP-2205 Professional Tripod Shtativ Telefon Uchun, 134sm, 360°',
    name_ru: 'Jmary KP-2205 Профессиональный штатив-трипод для телефона, 134см, 360°',
    description_uz: `Jmary KP-2205 — telefon, kamera va aksiya-kameralar uchun maxsus ishlab chiqilgan professional shtativ tripoddir. Mustahkam aluminiy qotishmasidan yasalgan bu shtativ, istalgan joyda — uyda, tabiatda yoki studiyada qulay foydalanish imkonini beradi.

Mahsulotning asosiy xususiyatlari: maksimal balandlik 134 sm, minimal balandlik 39.5 sm, yig'ilgan holda uzunligi 42 sm. Bosh qism 360° burilish va vertikal egilish imkoniyatiga ega, bu esa istalgan burchakda suratga olishni osonlashtiradi. Tezkor chiqarish tizimi (Quick Release Plate) kamera yoki telefoni bir zumda o'rnatish va olib olish imkonini beradi.

Uchta oyog'ida ishonchli qulflovchi mexanizm bor — shu tufayli shtativ har qanday yuzada barqaror turadi. Silliqqinamas rezina oyoqchalar polni yoki boshqa yuzani chizmaydi. Qulay qo'lda ko'targa torba (chexol) sovg'a sifatida kiritilgan.

Shtativda 3 ta seksiya bor: ularni birma-bir kengaytirish orqali kerakli balandlikni osonlik bilan sozlash mumkin. Boshqacha aytganda, bu qurilma yengil (atigi 1 kg atrofida), lekin sifati jihatidan professional darajada ishonchli. Smartfonlar, DSLR va mirrorless fotoapparatlar, GoPro va boshqa aksiya-kameralar, shuningdek kichik proyektorlar uchun ham moslashgan.`,
    description_ru: `Jmary KP-2205 — профессиональный штатив-трипод, специально разработанный для смартфонов, фотоаппаратов и экшн-камер. Изготовлен из высококачественного алюминиевого сплава, обеспечивающего прочность и лёгкость конструкции.

Основные характеристики: максимальная высота — 134 см, минимальная высота — 39.5 см, длина в сложенном виде — 42 см. Панорамная головка обеспечивает вращение на 360° и наклон по вертикали, что позволяет снимать с любого угла. Система быстрого крепления (Quick Release Plate) позволяет мгновенно установить или снять камеру.

Три надёжных фиксатора на ножках обеспечивают устойчивость на любых поверхностях. Резиновые нескользящие ножки защищают покрытие пола. В комплект входит удобный чехол для переноски (в подарок).

Штатив имеет 3 выдвижные секции, что позволяет легко настроить высоту. Устройство весит около 1 кг и при этом обеспечивает профессиональный уровень надёжности. Совместим со смартфонами, DSLR и беззеркальными фотоаппаратами, GoPro и другими экшн-камерами, а также небольшими проекторами.`,
    params: {
      'Maksimal balandlik': '134 sm',
      'Minimal balandlik': '39.5 sm',
      'Yig\'ilgan o\'lchami': '42 sm',
      'Yuk ko\'tarish qobiliyati': '1.5 kg',
      'Bosh turi': '3D panoramik bosh, 360°',
      'Material': 'Aluminiy qotishma',
      'Mos qurilmalar': 'Smartfon, Kamera, Aksiya-kamera',
      'Seksiyalar soni': '3',
    },
  },
  {
    sku: 'JMARY-KP-2207',
    model: 'KP-2207',
    folder: '2207',
    name: 'Jmary KP-2207 2in1 Tripod+Monopod Shtativ 133sm, Gorizontal Qo\'l, 1.5kg Yuk',
    name_uz: 'Jmary KP-2207 2in1 Tripod+Monopod Shtativ 133sm, Gorizontal Qo\'l, 1.5kg Yuk',
    name_ru: 'Jmary KP-2207 2-в-1 Штатив-трипод+монопод 133см, горизонтальная штанга, нагрузка 1.5кг',
    description_uz: `Jmary KP-2207 — bu 2-ta-1da konsepsiyasini amalga oshirgan noyob professional shtativ. U an'anaviy tripod sifatida ham, monopod (yakka oyoq) sifatida ham ishlatila oladi. Bloger, fotograflar, videograf va ijodkorlar uchun ideal tanlov.

Mahsulotning asosiy xususiyatlari: maksimal balandlik 133 sm, minimal balandlik 38.5 sm. Maksimal yuk ko'tarish qobiliyati 1.5 kg — bu ko'pgina kameralar va smartfonlar uchun yetarli. Alohida ajralib turadigan xususiyati — gorizontal uzayuvchi qo'l (boom arm): u atigi bir harakatda o'rnatiladi va shtativning balandligiga qarab 610 mm dan 1330 mm gacha cho'ziladi. Bu narsa yuqoridan tushirib olish (overhead) suratlar uchun juda qulay.

Shtativ 3 seksiyali oyoqlardan iborat. Har bir oyoq mustahkam plastik qulflovchi halqa bilan mahkamlanadi. Pastki qismda yukni barqarorlashtirish uchun ilmoq (hook) mavjud — unga sumka yoki og'irlik osib qo'yish mumkin. Ortiqcha titrashni oldini olish uchun tebranishga qarshi konstruktsiya ishlab chiqilgan.

Komplektda: shtativ asosiy qismi, gorizontal qo'l to'plami, telefon ushlagich, 1/4 vintli universal adapterlar. Material — anodlangan qora aluminiy. Professionallar uchun mo'ljallangan, lekin ishlatish juda oddiy va qulay.`,
    description_ru: `Jmary KP-2207 — это уникальный профессиональный штатив с концепцией 2-в-1: он работает как обычный трипод, так и как монопод (одноногий штатив). Идеальный выбор для блогеров, фотографов, видеографов и творческих людей.

Основные характеристики: максимальная высота — 133 см, минимальная высота — 38.5 см. Максимальная нагрузка — 1.5 кг, что достаточно для большинства камер и смартфонов. Отличительная черта — горизонтальная выдвижная штанга (boom arm), которая устанавливается одним движением и выдвигается от 610 мм до 1330 мм в зависимости от высоты штатива. Незаменима для съёмки сверху вниз (overhead shot).

Штатив состоит из 3-секционных ног. Каждая нога фиксируется прочными пластиковыми зажимами. В нижней части имеется крюк для утяжелителя — на него можно повесить сумку или груз, чтобы повысить устойчивость. Конструкция разработана с учётом антивибрационных требований.

Комплект: основная часть штатива, горизонтальная штанга, держатель для телефона, универсальные адаптеры 1/4 дюйма. Материал — анодированный черный алюминий. Разработан для профессионалов, но прост и удобен в использовании.`,
    params: {
      'Maksimal balandlik': '133 sm',
      'Minimal balandlik': '38.5 sm',
      'Yig\'ilgan o\'lchami': '42 sm',
      'Yuk ko\'tarish qobiliyati': '1.5 kg',
      'Bosh turi': 'Pan-tilt bosh, gorizontal qo\'l',
      'Material': 'Aluminiy qotishma',
      'Mos qurilmalar': 'Smartfon, Kamera, Aksiya-kamera, Proyektor',
      'Seksiyalar soni': '3',
    },
  },
  {
    sku: 'JMARY-KP-2274',
    model: 'KP-2274',
    folder: '2274',
    name: 'Jmary KP-2274 Professional 2in1 Tripod Shtativ 167sm, 3kg Yuk, Kamera Uchun',
    name_uz: 'Jmary KP-2274 Professional 2in1 Tripod Shtativ 167sm, 3kg Yuk, Kamera Uchun',
    name_ru: 'Jmary KP-2274 Профессиональный 2-в-1 Штатив-трипод 167см, нагрузка 3кг, для камеры',
    description_uz: `Jmary KP-2274 — bu yuk ko'tarish qobiliyati 3 kg ga etib boradigan, maksimal balandligi 167 sm bo'lgan kuchli va mustahkam professional tripod shtativdir. Professional foto va video ijodkorlar uchun yaratilgan bu model 2-ta-1da (tripod + monopod) funksiyasini taqdim etadi.

Asosiy xususiyatlari: maksimal balandlik 167 sm, minimal balandlik 54 sm. Bu shtativ professional suratga olish uchun zarur bo'lgan barcha xususiyatlarga ega: og'ir kameralarni, ayniqsa katta linzali DSLR kameralarni ushlab turish uchun 3 kg yuk ko'tarish chidamliligi ajoyib natija hisoblanadi.

Bosh qism sifatli pan-tilt mexanizmga ega: yon tomonga burish va old-orqaga egilish harakatlari silliqqina va aniq amalga oshiriladi. Tezkor chiqarish platformasi (Quick Release) orqali kamerani 1/4 vintli standart adapter yordamida mahkam o'rnatish mumkin.

Uch oyog'i aluminiy asosli bo'lib, har birida qalinlashtirilgan profil ishlatilgan. Oyoqlarning 3 seksiyasi vintli qulflovchi mexanizm bilan taqdim etilgan. Qurilmani o'rnatish ham, yig'ib olish ham bir necha daqiqa oladi. Kompakt holda (54 sm) sumkaga sig'adi va osonlik bilan ko'tarish mumkin. Professionallar hamda tajribali hobbiistlar uchun mukammal tanlov.`,
    description_ru: `Jmary KP-2274 — это мощный и надёжный профессиональный штатив-трипод с максимальной высотой 167 см и грузоподъёмностью до 3 кг. Модель с функцией 2-в-1 (трипод + монопод) создана для профессиональных фотографов и видеографов.

Основные характеристики: максимальная высота — 167 см, минимальная высота — 54 см. Грузоподъёмность 3 кг позволяет уверенно удерживать тяжёлые камеры — в том числе DSLR с объективами большого диаметра — без малейшей вибрации.

Голова оснащена качественным механизмом pan-tilt: боковое вращение и вертикальный наклон выполняются плавно и точно. Система быстрого крепления (Quick Release) позволяет надёжно закрепить камеру с помощью стандартного переходника 1/4 дюйма.

Три ноги изготовлены из алюминия с утолщёнными профилями. Каждая из 3 секций фиксируется резьбовым замком. Установка и сборка занимает несколько минут. В сложенном виде (54 см) штатив помещается в сумку и легко переносится. Отличный выбор для профессионалов и опытных любителей.`,
    params: {
      'Maksimal balandlik': '167 sm',
      'Minimal balandlik': '54 sm',
      'Yig\'ilgan o\'lchami': '54 sm',
      'Yuk ko\'tarish qobiliyati': '3 kg',
      'Bosh turi': 'Pan-tilt professional bosh',
      'Material': 'Aluminiy qotishma',
      'Mos qurilmalar': 'DSLR Kamera, Mirrorless Kamera, Smartfon, Aksiya-kamera',
      'Seksiyalar soni': '3',
    },
  },
  {
    sku: 'JMARY-KP-2294',
    model: 'KP-2294',
    folder: '2294',
    name: 'Jmary KP-2294 Universal Ko\'p Funksiyali Tripod Shtativ Kamera Telefon Proyektor',
    name_uz: 'Jmary KP-2294 Universal Ko\'p Funksiyali Tripod Shtativ Kamera Telefon Proyektor',
    name_ru: 'Jmary KP-2294 Универсальный многофункциональный штатив для камеры, телефона, проектора',
    description_uz: `Jmary KP-2294 — bu haqiqatan ham universal ko'p funksiyali shtativ tripod bo'lib, bir vaqtning o'zida fotoapparat, smartfon, aksiya-kamera, planshet, projektor va halqa chiroq (ring light) uchun ishlatilishi mumkin. Blоger, streamer, o'qituvchi va kreativ mutaxassislar uchun eng qulay yechim.

Mahsulot xususiyatlari: maksimal balandlik 167 sm gacha yetadi va minimal holda ham barqaror turadi. Mustahkam aluminiy oyoqlar 3 seksiyali tuzilishga ega, har biri qulflovchi mexanizm bilan mahkamlanadi. Shtativ oyoqlarida silliqqinamas rezina qo'shimchalar bor — u istalgan yuzada qo'shimcha tutashni ta'minlaydi.

Bosh qismida 360° aylanuvchi ball head yoki pan-tilt head mavjud (modelga qarab). 1/4 vintli standart o'rnatish tizimi ushbu shtativni bozordagi aksariyat kamera va aksessuarlar bilan mos qiladi. Mahkam qulflovchi tizim tufayli kamerani o'rnatgandan so'ng u siljimaydi va titrash bo'lmaydi.

Qo'shimcha xususiyatlar: qurilmaning pastki markaziy qismida yukni barqarorlashtirish uchun ilmoq bor — unga qo'shimcha og'irlik osib qo'yiladi. Shtativ yig'ilganda ixcham ko'rinishga ega bo'ladi va maxsus sumkaga sig'adi (komplektda mavjud). Professional darajadagi shtativning qulaylik va narx jihatidan eng maqbul varianti.`,
    description_ru: `Jmary KP-2294 — это поистине универсальный многофункциональный штатив-трипод, который одновременно подходит для фотоаппарата, смартфона, экшн-камеры, планшета, проектора и кольцевой лампы. Лучшее решение для блогеров, стримеров, преподавателей и творческих профессионалов.

Характеристики: максимальная высота достигает 167 см, при этом штатив остаётся устойчивым даже в сложенном положении. Прочные алюминиевые ноги имеют 3-секционную конструкцию, каждая фиксируется замковым механизмом. На ножках — нескользящие резиновые накладки, обеспечивающие дополнительное сцепление с любой поверхностью.

В верхней части — вращающаяся на 360° головка (ball head или pan-tilt, в зависимости от модели). Стандартная резьба 1/4 дюйма делает штатив совместимым с большинством камер и аксессуаров на рынке. Жёсткая система фиксации исключает смещение и вибрацию после установки камеры.

Дополнительно: в нижней части центральной колонны находится крюк для утяжелителя — на него можно повесить груз для повышения устойчивости. В сложенном виде штатив компактен и помещается в специальную сумку (входит в комплект). Оптимальный вариант по соотношению удобство–качество–цена среди профессиональных штативов.`,
    params: {
      'Maksimal balandlik': '167 sm',
      'Minimal balandlik': '54 sm',
      'Yig\'ilgan o\'lchami': '60 sm',
      'Yuk ko\'tarish qobiliyati': '3 kg',
      'Bosh turi': 'Ball head, 360° aylanadi',
      'Material': 'Aluminiy qotishma',
      'Mos qurilmalar': 'Kamera, Smartfon, Planshet, Proyektor, Ring Light, Aksiya-kamera',
      'Seksiyalar soni': '3',
    },
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Jmary mahsulotlarini joylash boshlandi...\n');

  // ── STEP 1: Create Jmary brand ──
  console.log('📦 1-qadam: Jmary brendi yaratilmoqda...');
  const { data: existingBrand } = await supabase.from('brands').select('id').ilike('name', 'jmary').limit(1);
  let brandId;
  if (existingBrand && existingBrand.length > 0) {
    brandId = existingBrand[0].id;
    console.log('  ✅ Jmary brendi allaqachon mavjud, id:', brandId);
  } else {
    // Delete accidentally created brand first if any
    await supabase.from('brands').delete().ilike('name', 'Jmary');
    const newBrandId = crypto.randomUUID();
    const { data: newBrand, error: brandErr } = await supabase.from('brands').insert({ id: newBrandId, name: 'Jmary' }).select('id').single();
    if (brandErr) throw new Error('Brand yaratishda xato: ' + brandErr.message);
    brandId = newBrand.id;
    console.log('  ✅ Jmary brendi yaratildi, id:', brandId);
  }

  // ── STEP 2: Create category ──
  console.log('\n📂 2-qadam: Kategoriya yaratilmoqda...');
  const { data: existingCat } = await supabase.from('categories').select('id').or('name.ilike.%shtativ%,name_uz.ilike.%shtativ%').limit(1);
  let categoryId;
  if (existingCat && existingCat.length > 0) {
    categoryId = existingCat[0].id;
    console.log('  ✅ Kategoriya allaqachon mavjud, id:', categoryId);
  } else {
    const newCatId = Date.now().toString();
    const { data: newCat, error: catErr } = await supabase.from('categories').insert({
      id: newCatId,
      name: 'Shtativlar va tripodlar',
      name_uz: 'Shtativlar va tripodlar',
      name_ru: 'Штативы и триподы',
      parent_id: '3', // Elektronika
      is_deleted: false,
    }).select('id').single();
    if (catErr) throw new Error('Kategoriya yaratishda xato: ' + catErr.message);
    categoryId = newCat.id;
    console.log('  ✅ Kategoriya yaratildi, id:', categoryId);
  }

  // ── STEP 3: Create category params ──
  console.log('\n⚙️  3-qadam: Kategoriya parametrlari yaratilmoqda...');
  const catParams = [
    { name_uz: 'Maksimal balandlik', name_ru: 'Максимальная высота', type: 'text', sort_order: 1 },
    { name_uz: 'Minimal balandlik', name_ru: 'Минимальная высота', type: 'text', sort_order: 2 },
    { name_uz: 'Yig\'ilgan o\'lchami', name_ru: 'Длина в сложенном виде', type: 'text', sort_order: 3 },
    { name_uz: 'Yuk ko\'tarish qobiliyati', name_ru: 'Грузоподъёмность', type: 'text', sort_order: 4 },
    { name_uz: 'Bosh turi', name_ru: 'Тип головки', type: 'text', sort_order: 5 },
    { name_uz: 'Material', name_ru: 'Материал', type: 'select', sort_order: 6, predefined_values: ['Aluminiy qotishma', 'Karbon fiber', 'Plastik'] },
    { name_uz: 'Mos qurilmalar', name_ru: 'Совместимые устройства', type: 'text', sort_order: 7 },
    { name_uz: 'Seksiyalar soni', name_ru: 'Количество секций', type: 'select', sort_order: 8, predefined_values: ['2', '3', '4', '5'] },
  ];

  const paramIdMap = {}; // name_uz -> id
  const { data: existingParams } = await supabase.from('category_params').select('id, name_uz').eq('category_id', String(categoryId));
  const existingParamNames = (existingParams || []).map(p => p.name_uz);
  for (const ep of (existingParams || [])) paramIdMap[ep.name_uz] = ep.id;

  for (const cp of catParams) {
    if (existingParamNames.includes(cp.name_uz)) {
      console.log(`  ⏭️  Param allaqachon bor: ${cp.name_uz}`);
      continue;
    }
    const { data: newParam, error: paramErr } = await supabase.from('category_params').insert({
      category_id: String(categoryId),
      name: `${cp.name_uz} / ${cp.name_ru}`,
      name_uz: cp.name_uz,
      name_ru: cp.name_ru,
      type: cp.type,
      predefined_values: cp.predefined_values || [],
      is_required: false,
      sort_order: cp.sort_order,
    }).select('id').single();
    if (paramErr) { console.warn(`  ⚠️  Param yaratishda xato (${cp.name_uz}):`, paramErr.message); continue; }
    paramIdMap[cp.name_uz] = newParam.id;
    console.log(`  ✅ Param yaratildi: ${cp.name_uz}`);
  }

  // ── STEP 4 & 5: Upload images + Create products ──
  const groupId = crypto.randomUUID(); // Bitta guruh uchun
  console.log('\n🔗 Barcha 4 mahsulot bitta guruhga biriktiriladi, group_id:', groupId);

  const createdProductIds = [];

  for (const productDef of PRODUCT_DATA) {
    console.log(`\n📸 4-qadam: ${productDef.model} rasmlari yuklanmoqda...`);
    const folderPath = path.join(PRODUCTS_DIR, productDef.folder);
    
    let uploadedImages = [];
    let imageMetadata = {};

    try {
      uploadedImages = await uploadFolderImages(folderPath);
      for (const r of uploadedImages) {
        imageMetadata[r.url] = {
          blurDataURL: r.blurDataURL,
          lowResUrl: r.lowResUrl,
          xs: r.xs,
          md: r.md,
          lg: r.lg,
        };
      }
    } catch (err) {
      console.error('  ❌ Rasm yuklashda xato:', err.message);
    }

    const mainImage = uploadedImages.length > 0 ? uploadedImages[0].url : null;
    const allImageUrls = uploadedImages.map(r => r.url);

    console.log(`\n💾 5-qadam: ${productDef.model} mahsulot bazaga kiritilmoqda...`);
    const { data: newProduct, error: prodErr } = await supabase.from('products').insert({
      name: productDef.name,
      name_uz: productDef.name_uz,
      name_ru: productDef.name_ru,
      description: productDef.description_uz,
      description_uz: productDef.description_uz,
      description_ru: productDef.description_ru,
      price: 0,
      old_price: 0,
      category_id: String(categoryId),
      brand_id: String(brandId),
      sku: productDef.sku,
      model: productDef.model,
      group_id: groupId,
      stock: 1,
      is_deleted: false,
      image: mainImage,
      images: allImageUrls,
      image_metadata: imageMetadata,
      is_original: true,
      sales: 0,
      avg_rating: 0,
      review_count: 0,
      total_views: 0,
      total_wishlists: 0,
      total_returns: 0,
    }).select('id').single();

    if (prodErr) {
      console.error(`  ❌ Mahsulot yaratishda xato (${productDef.model}):`, prodErr.message);
      continue;
    }
    const productId = newProduct.id;
    createdProductIds.push(productId);
    console.log(`  ✅ Mahsulot yaratildi: ${productDef.model} → id: ${productId}`);

    // ── STEP 6: Add param values ──
    console.log(`  ⚙️  Parametrlar kiritilmoqda...`);
    for (const [paramName, paramValue] of Object.entries(productDef.params)) {
      const paramId = paramIdMap[paramName];
      if (!paramId) { console.warn(`    ⚠️  Param ID topilmadi: ${paramName}`); continue; }
      const { error: pvErr } = await supabase.from('product_param_values').insert({
        product_id: productId,
        param_id: paramId,
        value: paramValue,
      });
      if (pvErr) console.warn(`    ⚠️  Param qiymati kiritishda xato (${paramName}):`, pvErr.message);
      else console.log(`    ✅ ${paramName}: ${paramValue}`);
    }
  }

  // ── Final report ──
  console.log('\n\n🎉 ================================');
  console.log('✅ Barcha ishlar yakunlandi!');
  console.log('================================');
  console.log(`Brand ID:    ${brandId}`);
  console.log(`Category ID: ${categoryId}`);
  console.log(`Group ID:    ${groupId}`);
  console.log(`Yaratilgan mahsulotlar (${createdProductIds.length} ta):`);
  createdProductIds.forEach((id, i) => console.log(`  ${i+1}. ${PRODUCT_DATA[i]?.model}: ${id}`));
}

main().catch(err => {
  console.error('\n💥 Xato:', err.message);
  process.exit(1);
});
