/**
 * Jmary mahsulotlarni bazaga kiritish (rasmlar allaqachon yuklangan)
 * Faqat mahsulotlar va parametrlarni kiritadi
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// — Ma'lumotlar (allaqachon yuklangan rasmlar URL lari) —
const BRAND_ID     = 'feb6d64a-0e0d-467f-8ed4-2b01bc7a6e18'; // Jmary
const CATEGORY_ID  = '1785864351977';                          // Shtativlar va tripodlar
const GROUP_ID     = crypto.randomUUID();                      // Yangi bitta guruh

// Rasmlar URL lari (Yandex S3 dan allaqachon yuklangan)
const IMAGES = {
  KP2205: {
    images: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864355139_2205__1_.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864357455_2205__2_.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864358376_2205__3_.avif',
    ],
    thumbs: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864355139_2205__1__thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864357455_2205__2__thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864358376_2205__3__thumb.webp',
    ],
    xs: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864355139_2205__1__xs.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864357455_2205__2__xs.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864358376_2205__3__xs.webp',
    ],
    md: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864355139_2205__1__md.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864357455_2205__2__md.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864358376_2205__3__md.webp',
    ],
    lg: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864355139_2205__1__lg.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864357455_2205__2__lg.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864358376_2205__3__lg.webp',
    ],
  },
  KP2207: {
    images: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864359555_1.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360311_12.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360882_123.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864361508_13.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362109_2.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362643_21.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363286_213.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363848_23.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365201_3.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365836_31.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366441_311.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366968_32.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864367535_321.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864368026_323.avif',
    ],
    thumbs: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864359555_1_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360311_12_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360882_123_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864361508_13_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362109_2_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362643_21_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363286_213_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363848_23_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365201_3_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365836_31_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366441_311_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366968_32_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864367535_321_thumb.webp',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864368026_323_thumb.webp',
    ],
    xs:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864359555_1_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360311_12_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360882_123_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864361508_13_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362109_2_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362643_21_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363286_213_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363848_23_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365201_3_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365836_31_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366441_311_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366968_32_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864367535_321_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864368026_323_xs.webp'],
    md:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864359555_1_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360311_12_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360882_123_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864361508_13_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362109_2_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362643_21_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363286_213_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363848_23_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365201_3_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365836_31_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366441_311_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366968_32_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864367535_321_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864368026_323_md.webp'],
    lg:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864359555_1_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360311_12_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864360882_123_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864361508_13_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362109_2_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864362643_21_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363286_213_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864363848_23_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365201_3_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864365836_31_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366441_311_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864366968_32_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864367535_321_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864368026_323_lg.webp'],
  },
  KP2274: {
    images: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369192_2272_2.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369854_2274_10.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864370856_2274_11.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864371436_2274_12.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864372364_2274_13.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373183_2274_14.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373749_2274_3.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375294_2274_4.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375826_2274_5.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376383_2274_6.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376944_2274_8.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864377529_2274_9.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864378127_original.avif',
    ],
    thumbs: ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369192_2272_2_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369854_2274_10_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864370856_2274_11_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864371436_2274_12_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864372364_2274_13_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373183_2274_14_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373749_2274_3_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375294_2274_4_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375826_2274_5_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376383_2274_6_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376944_2274_8_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864377529_2274_9_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864378127_original_thumb.webp'],
    xs:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369192_2272_2_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369854_2274_10_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864370856_2274_11_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864371436_2274_12_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864372364_2274_13_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373183_2274_14_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373749_2274_3_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375294_2274_4_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375826_2274_5_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376383_2274_6_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376944_2274_8_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864377529_2274_9_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864378127_original_xs.webp'],
    md:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369192_2272_2_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369854_2274_10_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864370856_2274_11_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864371436_2274_12_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864372364_2274_13_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373183_2274_14_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373749_2274_3_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375294_2274_4_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375826_2274_5_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376383_2274_6_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376944_2274_8_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864377529_2274_9_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864378127_original_md.webp'],
    lg:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369192_2272_2_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864369854_2274_10_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864370856_2274_11_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864371436_2274_12_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864372364_2274_13_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373183_2274_14_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864373749_2274_3_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375294_2274_4_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864375826_2274_5_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376383_2274_6_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864376944_2274_8_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864377529_2274_9_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864378127_original_lg.webp'],
  },
  KP2294: {
    images: [
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864379304_23.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380246_32456.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380861_412.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381358_53423.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381740_64532.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382174_75643.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382598_76543.avif',
      'https://storage.yandexcloud.net/savdomarketimag/uploads/1785864383107_original.avif',
    ],
    thumbs: ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864379304_23_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380246_32456_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380861_412_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381358_53423_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381740_64532_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382174_75643_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382598_76543_thumb.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864383107_original_thumb.webp'],
    xs:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864379304_23_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380246_32456_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380861_412_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381358_53423_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381740_64532_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382174_75643_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382598_76543_xs.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864383107_original_xs.webp'],
    md:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864379304_23_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380246_32456_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380861_412_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381358_53423_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381740_64532_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382174_75643_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382598_76543_md.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864383107_original_md.webp'],
    lg:  ['https://storage.yandexcloud.net/savdomarketimag/uploads/1785864379304_23_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380246_32456_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864380861_412_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381358_53423_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864381740_64532_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382174_75643_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864382598_76543_lg.webp','https://storage.yandexcloud.net/savdomarketimag/uploads/1785864383107_original_lg.webp'],
  },
};

function buildImageMetadata(imgs) {
  const meta = {};
  imgs.images.forEach((url, i) => {
    meta[url] = {
      lowResUrl:   imgs.thumbs[i],
      xs:          imgs.xs[i],
      md:          imgs.md[i],
      lg:          imgs.lg[i],
    };
  });
  return meta;
}

const PRODUCTS = [
  {
    sku: 'JMARY-KP-2205', model: 'KP-2205',
    name: 'Jmary KP-2205 Professional Tripod Shtativ Telefon Uchun, 134sm, 360°',
    name_uz: 'Jmary KP-2205 Professional Tripod Shtativ Telefon Uchun, 134sm, 360°',
    name_ru: 'Jmary KP-2205 Профессиональный штатив-трипод для телефона, 134см, 360°',
    description_uz: `Jmary KP-2205 — telefon, kamera va aksiya-kameralar uchun maxsus ishlab chiqilgan professional shtativ tripoddir. Mustahkam aluminiy qotishmasidan yasalgan bu shtativ, istalgan joyda — uyda, tabiatda yoki studiyada qulay foydalanish imkonini beradi.\n\nMahsulotning asosiy xususiyatlari: maksimal balandlik 134 sm, minimal balandlik 39.5 sm, yig'ilgan holda uzunligi 42 sm. Bosh qism 360° burilish va vertikal egilish imkoniyatiga ega, bu esa istalgan burchakda suratga olishni osonlashtiradi. Tezkor chiqarish tizimi (Quick Release Plate) kamera yoki telefonni bir zumda o'rnatish va olib olish imkonini beradi.\n\nUchta oyog'ida ishonchli qulflovchi mexanizm bor — shu tufayli shtativ har qanday yuzada barqaror turadi. Silliqqinamas rezina oyoqchalar polni yoki boshqa yuzani chizmaydi. Qulay qo'lda ko'targa torba (chexol) sovg'a sifatida kiritilgan.\n\nShtativda 3 ta seksiya bor: ularni birma-bir kengaytirish orqali kerakli balandlikni osonlik bilan sozlash mumkin. Smartfonlar, DSLR va mirrorless fotoapparatlar, GoPro va boshqa aksiya-kameralar, shuningdek kichik proyektorlar uchun ham moslashgan.`,
    description_ru: `Jmary KP-2205 — профессиональный штатив-трипод, специально разработанный для смартфонов, фотоаппаратов и экшн-камер. Изготовлен из высококачественного алюминиевого сплава, обеспечивающего прочность и лёгкость конструкции.\n\nОсновные характеристики: максимальная высота — 134 см, минимальная высота — 39.5 см, длина в сложенном виде — 42 см. Панорамная головка обеспечивает вращение на 360° и наклон по вертикали, что позволяет снимать с любого угла. Система быстрого крепления (Quick Release Plate) позволяет мгновенно установить или снять камеру.\n\nТри надёжных фиксатора на ножках обеспечивают устойчивость на любых поверхностях. Резиновые нескользящие ножки защищают покрытие пола. В комплект входит удобный чехол для переноски (в подарок).\n\nШтатив имеет 3 выдвижные секции. Совместим со смартфонами, DSLR и беззеркальными фотоаппаратами, GoPro и другими экшн-камерами, а также небольшими проекторами.`,
    imgs: IMAGES.KP2205,
    params: {
      'Maksimal balandlik': '134 sm', 'Minimal balandlik': '39.5 sm',
      "Yig'ilgan o'lchami": '42 sm', "Yuk ko'tarish qobiliyati": '1.5 kg',
      'Bosh turi': '3D panoramik bosh, 360°', 'Material': 'Aluminiy qotishma',
      'Mos qurilmalar': 'Smartfon, Kamera, Aksiya-kamera', 'Seksiyalar soni': '3',
    },
  },
  {
    sku: 'JMARY-KP-2207', model: 'KP-2207',
    name: "Jmary KP-2207 2in1 Tripod+Monopod Shtativ 133sm, Gorizontal Qo'l, 1.5kg Yuk",
    name_uz: "Jmary KP-2207 2in1 Tripod+Monopod Shtativ 133sm, Gorizontal Qo'l, 1.5kg Yuk",
    name_ru: 'Jmary KP-2207 2-в-1 Штатив-трипод+монопод 133см, горизонтальная штанга, нагрузка 1.5кг',
    description_uz: `Jmary KP-2207 — bu 2-ta-1da konsepsiyasini amalga oshirgan noyob professional shtativ. U an'anaviy tripod sifatida ham, monopod (yakka oyoq) sifatida ham ishlatila oladi. Bloger, fotograflar, videograf va ijodkorlar uchun ideal tanlov.\n\nMahsulotning asosiy xususiyatlari: maksimal balandlik 133 sm, minimal balandlik 38.5 sm. Maksimal yuk ko'tarish qobiliyati 1.5 kg. Alohida ajralib turadigan xususiyati — gorizontal uzayuvchi qo'l (boom arm): bir harakatda o'rnatiladi va 610 mm dan 1330 mm gacha cho'ziladi. Bu narsa yuqoridan tushirib olish (overhead) suratlar uchun juda qulay.\n\nShtativ 3 seksiyali oyoqlardan iborat. Har bir oyoq mustahkam plastik qulflovchi halqa bilan mahkamlanadi. Pastki qismda yukni barqarorlashtirish uchun ilmoq (hook) mavjud — unga sumka yoki og'irlik osib qo'yish mumkin.\n\nKomplektda: shtativ asosiy qismi, gorizontal qo'l to'plami, telefon ushlagich, 1/4 vintli universal adapterlar. Material — anodlangan qora aluminiy.`,
    description_ru: `Jmary KP-2207 — это уникальный профессиональный штатив с концепцией 2-в-1: он работает как обычный трипод, так и как монопод (одноногий штатив). Идеальный выбор для блогеров, фотографов, видеографов и творческих людей.\n\nОсновные характеристики: максимальная высота — 133 см, минимальная высота — 38.5 см. Максимальная нагрузка — 1.5 кг. Отличительная черта — горизонтальная выдвижная штанга (boom arm): устанавливается одним движением и выдвигается от 610 мм до 1330 мм. Незаменима для съёмки сверху вниз (overhead shot).\n\nШтатив состоит из 3-секционных ног с надёжными пластиковыми зажимами. В нижней части — крюк для утяжелителя. В комплект входят: основная часть штатива, горизонтальная штанга, держатель для телефона, адаптеры 1/4 дюйма. Материал — анодированный чёрный алюминий.`,
    imgs: IMAGES.KP2207,
    params: {
      'Maksimal balandlik': '133 sm', 'Minimal balandlik': '38.5 sm',
      "Yig'ilgan o'lchami": '42 sm', "Yuk ko'tarish qobiliyati": '1.5 kg',
      "Bosh turi": "Pan-tilt bosh, gorizontal qo'l", 'Material': 'Aluminiy qotishma',
      'Mos qurilmalar': 'Smartfon, Kamera, Aksiya-kamera, Proyektor', 'Seksiyalar soni': '3',
    },
  },
  {
    sku: 'JMARY-KP-2274', model: 'KP-2274',
    name: 'Jmary KP-2274 Professional 2in1 Tripod Shtativ 167sm, 3kg Yuk, Kamera Uchun',
    name_uz: 'Jmary KP-2274 Professional 2in1 Tripod Shtativ 167sm, 3kg Yuk, Kamera Uchun',
    name_ru: 'Jmary KP-2274 Профессиональный 2-в-1 Штатив-трипод 167см, нагрузка 3кг, для камеры',
    description_uz: `Jmary KP-2274 — yuk ko'tarish qobiliyati 3 kg, maksimal balandligi 167 sm bo'lgan kuchli professional tripod shtavitdir. Professional foto va video ijodkorlar uchun yaratilgan bu model 2-ta-1da (tripod + monopod) funksiyasini taqdim etadi.\n\nAsosiy xususiyatlari: maksimal balandlik 167 sm, minimal balandlik 54 sm. Og'ir kameralarni, ayniqsa katta linzali DSLR kameralarni ushlab turish uchun 3 kg yuk ko'tarish chidamliligi ajoyib natija hisoblanadi.\n\nBosh qism sifatli pan-tilt mexanizmga ega: yon tomonga burish va old-orqaga egilish harakatlari silliqqina va aniq amalga oshiriladi. Tezkor chiqarish platformasi (Quick Release) orqali kamerani 1/4 vintli standart adapter yordamida mahkam o'rnatish mumkin.\n\nUch oyog'i aluminiy asosli bo'lib, har birida qalinlashtirilgan profil ishlatilgan. Kompakt holda (54 sm) sumkaga sig'adi. Professionallar hamda tajribali hobbiistlar uchun mukammal tanlov.`,
    description_ru: `Jmary KP-2274 — мощный и надёжный профессиональный штатив-трипод с максимальной высотой 167 см и грузоподъёмностью до 3 кг. Модель с функцией 2-в-1 (трипод + монопод) создана для профессиональных фотографов и видеографов.\n\nОсновные характеристики: максимальная высота — 167 см, минимальная высота — 54 см. Грузоподъёмность 3 кг позволяет уверенно удерживать тяжёлые камеры, в том числе DSLR с объективами большого диаметра.\n\nГолова оснащена качественным механизмом pan-tilt. Система быстрого крепления (Quick Release) с резьбой 1/4 дюйма. Три ноги с утолщёнными алюминиевыми профилями и 3 секциями. В сложенном виде (54 см) помещается в сумку. Отличный выбор для профессионалов и опытных любителей.`,
    imgs: IMAGES.KP2274,
    params: {
      'Maksimal balandlik': '167 sm', 'Minimal balandlik': '54 sm',
      "Yig'ilgan o'lchami": '54 sm', "Yuk ko'tarish qobiliyati": '3 kg',
      'Bosh turi': 'Pan-tilt professional bosh', 'Material': 'Aluminiy qotishma',
      'Mos qurilmalar': 'DSLR Kamera, Mirrorless Kamera, Smartfon, Aksiya-kamera', 'Seksiyalar soni': '3',
    },
  },
  {
    sku: 'JMARY-KP-2294', model: 'KP-2294',
    name: "Jmary KP-2294 Universal Ko'p Funksiyali Tripod Shtativ Kamera Telefon Proyektor",
    name_uz: "Jmary KP-2294 Universal Ko'p Funksiyali Tripod Shtativ Kamera Telefon Proyektor",
    name_ru: 'Jmary KP-2294 Универсальный многофункциональный штатив для камеры, телефона, проектора',
    description_uz: `Jmary KP-2294 — bu haqiqatan ham universal ko'p funksiyali shtativ tripod bo'lib, bir vaqtning o'zida fotoapparat, smartfon, aksiya-kamera, planshet, projektor va halqa chiroq (ring light) uchun ishlatilishi mumkin. Bloger, streamer, o'qituvchi va kreativ mutaxassislar uchun eng qulay yechim.\n\nMahsulot xususiyatlari: maksimal balandlik 167 sm gacha yetadi va minimal holda ham barqaror turadi. Mustahkam aluminiy oyoqlar 3 seksiyali tuzilishga ega, har biri qulflovchi mexanizm bilan mahkamlanadi. Shtativ oyoqlarida silliqqinamas rezina qo'shimchalar bor.\n\nBosh qismida 360° aylanuvchi ball head mavjud. 1/4 vintli standart o'rnatish tizimi ushbu shtativni bozordagi aksariyat kamera va aksessuarlar bilan mos qiladi. Mahkam qulflovchi tizim tufayli kamerani o'rnatgandan so'ng u siljimaydi va titrash bo'lmaydi.\n\nPastki markaziy qismida yukni barqarorlashtirish uchun ilmoq bor. Shtativ yig'ilganda ixcham ko'rinishga ega bo'ladi va maxsus sumkaga sig'adi (komplektda mavjud).`,
    description_ru: `Jmary KP-2294 — это поистине универсальный многофункциональный штатив-трипод, который подходит для фотоаппарата, смартфона, экшн-камеры, планшета, проектора и кольцевой лампы. Лучшее решение для блогеров, стримеров, преподавателей и творческих профессионалов.\n\nХарактеристики: максимальная высота — 167 см. Прочные алюминиевые ноги имеют 3-секционную конструкцию с замковым механизмом и нескользящими резиновыми накладками.\n\nВ верхней части — вращающаяся на 360° шаровая головка (ball head). Стандартная резьба 1/4 дюйма совместима с большинством камер и аксессуаров. Жёсткая система фиксации исключает смещение и вибрацию.\n\nВ нижней части — крюк для утяжелителя. В сложенном виде штатив помещается в специальную сумку (входит в комплект). Оптимальный вариант по соотношению качество–удобство–цена.`,
    imgs: IMAGES.KP2294,
    params: {
      'Maksimal balandlik': '167 sm', 'Minimal balandlik': '54 sm',
      "Yig'ilgan o'lchami": '60 sm', "Yuk ko'tarish qobiliyati": '3 kg',
      'Bosh turi': 'Ball head, 360° aylanadi', 'Material': 'Aluminiy qotishma',
      'Mos qurilmalar': 'Kamera, Smartfon, Planshet, Proyektor, Ring Light, Aksiya-kamera', 'Seksiyalar soni': '3',
    },
  },
];

async function main() {
  console.log('🚀 Mahsulotlar bazaga kiritilmoqda...');
  console.log('   Brand ID:    ', BRAND_ID);
  console.log('   Category ID: ', CATEGORY_ID);
  console.log('   Group ID:    ', GROUP_ID);

  // Get category params for ID mapping
  const { data: catParams } = await supabase
    .from('category_params').select('id, name_uz')
    .eq('category_id', CATEGORY_ID);
  const paramIdMap = {};
  (catParams || []).forEach(p => { paramIdMap[p.name_uz] = p.id; });
  console.log('\n   Topilgan parametrlar:', Object.keys(paramIdMap).length, 'ta');

  const createdProducts = [];

  for (const p of PRODUCTS) {
    console.log(`\n💾 Mahsulot kiritilmoqda: ${p.model}...`);
    const imageMetadata = buildImageMetadata(p.imgs);

    const { data: newProd, error: prodErr } = await supabase.from('products').insert({
      id: crypto.randomUUID(),
      name:           p.name,
      name_uz:        p.name_uz,
      name_ru:        p.name_ru,
      description:    p.description_uz,
      description_uz: p.description_uz,
      description_ru: p.description_ru,
      price:          0,
      old_price:      0,
      category_id:    CATEGORY_ID,
      brand_id:       BRAND_ID,
      sku:            p.sku,
      model:          p.model,
      group_id:       GROUP_ID,
      stock:          1,
      is_deleted:     false,
      image:          p.imgs.images[0],
      images:         p.imgs.images,
      image_metadata: imageMetadata,
      is_original:    true,
      sales:          0,
      avg_rating:     0,
      review_count:   0,
      total_views:    0,
      total_wishlists: 0,
      total_returns:  0,
    }).select('id').single();

    if (prodErr) {
      console.error(`  ❌ Xato (${p.model}):`, prodErr.message);
      continue;
    }

    console.log(`  ✅ Mahsulot yaratildi: ${p.model} → ${newProd.id}`);
    createdProducts.push({ model: p.model, id: newProd.id });

    // Insert param values
    let paramOk = 0, paramFail = 0;
    for (const [pName, pVal] of Object.entries(p.params)) {
      const pid = paramIdMap[pName];
      if (!pid) { paramFail++; continue; }
      const { error: pvErr } = await supabase.from('product_param_values').insert({
        product_id: newProd.id,
        param_id:   pid,
        value:      pVal,
      });
      if (pvErr) { paramFail++; console.warn(`    ⚠️  ${pName}:`, pvErr.message); }
      else paramOk++;
    }
    console.log(`  ⚙️  Parametrlar: ${paramOk} kiritildi, ${paramFail} o'tkazib yuborildi`);
  }

  console.log('\n\n🎉 ============================================================');
  console.log('✅ Hammasi muvaffaqiyatli yakunlandi!');
  console.log('=============================================================');
  console.log('Jmary brend ID:   ', BRAND_ID);
  console.log('Kategoriya ID:    ', CATEGORY_ID);
  console.log('Guruh (group_id): ', GROUP_ID);
  console.log(`\nYaratilgan mahsulotlar (${createdProducts.length}/4):`);
  createdProducts.forEach((p, i) => console.log(`  ${i+1}. ${p.model}: ${p.id}`));
}

main().catch(err => {
  console.error('\n💥 Xato:', err.message);
  process.exit(1);
});
