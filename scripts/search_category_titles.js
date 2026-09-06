const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const token = "eyJraWQiOiIwcE9oTDBBVXlWSXF1V0w1U29NZTdzcVNhS2FqYzYzV1N5THZYb0ZhWXRNIiwiYWxnIjoiRWREU0EiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJVenVtIElEIiwiaWF0IjoxNzg4Njc2MTc3LCJzdWIiOiJmNTlhMDA4ZC02NjNkLTQ5Y2QtYTBjNC1lMTRlOWZjZDA0OGUiLCJhdWQiOlsidXp1bV9hcHBzIiwibWFya2V0L3dlYiJdLCJldmVudHMiOnt9LCJleHAiOjE3ODg2ODY5Nzd9.VWVY0W2SNnI414SKzaP26gYLTqkrZBhe9UFiZgFCC5WLbZ9hux0pV7nK0bo7R1TydElnCMRELd8LPq7t5q82BQ";
const xiid = "b7b25dac-7e68-4ef5-a714-ba651a527a37";

const COLOR_RU_MAP = {
  'qora': 'Черный',
  'oq': 'Белый',
  'oltin': 'Золотой',
  'tilla': 'Золотой',
  'kumush': 'Серебристый',
  'kulrang': 'Серый',
  'titan': 'Титан',
  'qizil': 'Красный',
  "ko'k": 'Синий',
  'kok': 'Синий',
  'moviy': 'Голубой',
  'yashil': 'Зеленый',
  'pushti': 'Розовый',
  'sariq': 'Желтый',
  'limon': 'Лимонный',
  'binafsha': 'Фиолетовый',
  'jigarrang': 'Коричневый',
  'metall': 'Металлик',
  'bronza': 'Бронзовый',
  'kumush / qora': 'Серебристый / Черный',
  'oltin / qora': 'Золотой / Черный',
  'qora / oltin': 'Черный / Золотой',
  'qora / kumush': 'Черный / Серебристый',
  'qora / qizil': 'Черный / Красный',
  'qora / kok': 'Черный / Синий',
  "qora / ko'k": 'Черный / Синий',
  'yashil / oltin': 'Зеленый / Золотой',
  'oltin / yashil': 'Золотой / Зеленый'
};

function translateColorToRu(colorUz) {
  if (!colorUz || colorUz === '-') return '';
  const key = colorUz.toLowerCase().trim();
  if (COLOR_RU_MAP[key]) return COLOR_RU_MAP[key];

  if (key.includes('/')) {
    const parts = key.split('/').map(p => p.trim());
    const ruParts = parts.map(p => COLOR_RU_MAP[p] || p);
    return ruParts.join(' / ');
  }
  return colorUz;
}

const query = `query MakeSearch_ItemsAndFilters($queryInput: MakeSearchQueryInput!) {
  makeSearch(query: $queryInput) {
    items {
      catalogCard {
        productId
        title
      }
    }
  }
}`;

async function searchUzumGraphQL(text, lang) {
  const payload = JSON.stringify({
    operationName: 'MakeSearch_ItemsAndFilters',
    query: query,
    variables: {
      queryInput: {
        text: text,
        showAdultContent: "TRUE",
        filters: [],
        sort: "BY_RELEVANCE_DESC",
        pagination: {
          offset: 0,
          limit: 10
        },
        correctQuery: true
      }
    }
  });

  return new Promise((resolve) => {
    const req = https.request('https://graphql.uzum.uz/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Accept-Language': lang,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'authorization': `Bearer ${token}`,
        'x-iid': xiid,
        'apollographql-client-name': 'web-customers',
        'apollographql-client-version': '1.63.2',
        'city-id': '1'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data?.makeSearch?.items?.map(i => i.catalogCard) || []);
        } catch(e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.write(payload);
    req.end();
  });
}

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,+/g, ',')
    .replace(/\s*,\s*$/, '')
    .trim();
}

function isCleanSingleModelMatch(title, brandName, model) {
  if (!title || !model || !brandName) return false;
  const t = title.toLowerCase();
  const b = brandName.toLowerCase();
  const m = model.toLowerCase().trim();

  // 1. MUST contain brand name
  if (!t.includes(b)) {
    return false;
  }

  // 2. Reject multi-model listing spam (e.g. 102, 106, 107, 117 or V-276, V-282, V-671)
  const commaCount = (title.match(/,/g) || []).length;
  const vCount = (title.match(/\bv[- ]?\d+/gi) || []).length;
  if (vCount > 1) {
    return false; // Multi-model spam bundle title
  }

  // 3. Exact model match
  const mClean = m.replace(/[^a-z0-9]/g, '');
  const mDash = m.includes('-') ? m : m.replace(/([a-z]+)(\d+)/i, '$1-$2');
  const mSpace = m.includes(' ') ? m : m.replace(/([a-z]+)(\d+)/i, '$1 $2');
  const mDigits = m.replace(/\D/g, '');

  if (t.includes(m.toLowerCase()) || t.includes(mDash.toLowerCase()) || t.includes(mSpace.toLowerCase())) {
    return true;
  }
  
  if (mDigits.length >= 3) {
    const regex = new RegExp(`\\b(v[- ]?)?${mDigits}\\b`, 'i');
    if (regex.test(title)) {
      return true;
    }
  }

  return false;
}

function pickBestCards(uzCards, ruCards, brandName, model) {
  if (!uzCards || !ruCards || uzCards.length === 0) return null;

  for (let i = 0; i < uzCards.length; i++) {
    const cardUz = uzCards[i];
    if (isCleanSingleModelMatch(cardUz.title, brandName, model)) {
      const cardRu = ruCards.find(r => r.productId === cardUz.productId) || ruCards[i];
      if (cardRu && isCleanSingleModelMatch(cardRu.title, brandName, model)) {
        return {
          uz: cleanTitle(cardUz.title),
          ru: cleanTitle(cardRu.title)
        };
      }
    }
  }

  return null;
}

function generateFallback(categoryName, brandName, model, colorName) {
  const cat = (categoryName || '').toLowerCase();
  let uz = '';
  let ru = '';

  const colorUz = colorName && colorName !== '-' ? `, ${colorName}` : '';
  const colorRuTranslated = translateColorToRu(colorName);
  const colorRu = colorRuTranslated ? `, ${colorRuTranslated}` : '';

  if (cat.includes('trimmer')) {
    uz = `Soch va soqol olish uchun professional trimmer ${brandName} ${model}${colorUz}`;
    ru = `Профессиональный триммер для волос и бороды ${brandName} ${model}${colorRu}`;
  } else if (cat.includes('epilyator')) {
    uz = `Ayollar uchun professional epilyator ${brandName} ${model}${colorUz}`;
    ru = `Профессиональный эпилятор для женщин ${brandName} ${model}${colorRu}`;
  } else if (cat.includes('fen-shotka')) {
    uz = `Soch turmaklash uchun fen-cho'tka ${brandName} ${model}${colorUz}`;
    ru = `Фен-щетка для укладки волос ${brandName} ${model}${colorRu}`;
  } else if (cat.includes('fen')) {
    uz = `Soch quritish uchun professional fen ${brandName} ${model}${colorUz}`;
    ru = `Профессиональный фен для волос ${brandName} ${model}${colorRu}`;
  } else if (cat.includes('dazmol') || cat.includes('щипцы')) {
    uz = `Soch to'g'rilash uchun dazmol ${brandName} ${model}${colorUz}`;
    ru = `Выпрямитель (утюжок) для волос ${brandName} ${model}${colorRu}`;
  } else if (cat.includes('styler') || cat.includes('turmaklash')) {
    uz = `Soch turmaklash uchun ko'p funksiyali stayler ${brandName} ${model}${colorUz}`;
    ru = `Многофункциональный стайлер для волос ${brandName} ${model}${colorRu}`;
  } else if (cat.includes('kalonka')) {
    uz = `Portativ simsiz Bluetooth kalonka ${brandName} ${model}${colorUz}`;
    ru = `Портативная беспроводная Bluetooth колонка ${brandName} ${model}${colorRu}`;
  } else if (cat.includes('quloqchin') || cat.includes('наушники')) {
    uz = `Simsiz Bluetooth quloqchinlar ${brandName} ${model}${colorUz}`;
    ru = `Беспроводные Bluetooth наушники ${brandName} ${model}${colorRu}`;
  } else if (cat.includes('shtativ')) {
    uz = `Telefon va kamera uchun shtativ tripod ${brandName} ${model}${colorUz}`;
    ru = `Штатив-тренога для телефона и камеры ${brandName} ${model}${colorRu}`;
  } else {
    uz = `${brandName} ${model}${colorUz}`;
    ru = `${brandName} ${model}${colorRu}`;
  }

  return { uz, ru };
}

async function processCategory(categoryId) {
  const { data: cat } = await supabase.from('categories').select('id, name').eq('id', categoryId).single();
  const { data: brands } = await supabase.from('brands').select('id, name');
  const brandMap = {};
  brands.forEach(b => brandMap[b.id] = b.name);

  const { data: prods } = await supabase
    .from('products')
    .select('id, brand_id, model, color_name, name, name_uz, name_ru')
    .eq('category_id', categoryId)
    .eq('is_deleted', false)
    .order('model', { ascending: true });

  console.log(`Processing category: ${cat.name} (${prods.length} products)...`);

  const results = [];

  for (let i = 0; i < prods.length; i++) {
    const p = prods[i];
    const brandName = brandMap[p.brand_id] || '';
    const searchTerm = `${brandName} ${p.model}`.trim();

    // Query Uzum in both languages
    const [uzCards, ruCards] = await Promise.all([
      searchUzumGraphQL(searchTerm, 'uz-UZ'),
      searchUzumGraphQL(searchTerm, 'ru-RU')
    ]);

    const bestMatch = pickBestCards(uzCards, ruCards, brandName, p.model);
    const fallback = generateFallback(cat.name, brandName, p.model, p.color_name);

    const isUzum = !!bestMatch;
    const finalUz = bestMatch ? bestMatch.uz : fallback.uz;
    const finalRu = bestMatch ? bestMatch.ru : fallback.ru;

    results.push({
      id: p.id,
      brand: brandName,
      model: p.model,
      color: p.color_name,
      source: isUzum ? 'UZUM_EXACT' : 'STANDARDIZED',
      name_uz: finalUz,
      name_ru: finalRu
    });

    if ((i + 1) % 15 === 0 || i === prods.length - 1) {
      console.log(`Progress: ${i + 1}/${prods.length}...`);
    }

    await new Promise(r => setTimeout(r, 80));
  }

  return { cat, results };
}

async function main() {
  const targetCategory = process.argv[2] || '406';
  const { cat, results } = await processCategory(targetCategory);
  
  const uzumCount = results.filter(r => r.source === 'UZUM_EXACT').length;
  const genCount = results.filter(r => r.source === 'STANDARDIZED').length;

  console.log(`\n========================================`);
  console.log(`Category: ${cat.name} (Total: ${results.length})`);
  console.log(`Matched on Uzum: ${uzumCount}`);
  console.log(`Standardized Generated: ${genCount}`);
  console.log(`========================================\n`);

  const outPath = path.join(__dirname, `category_${targetCategory}_results.json`);
  fs.writeFileSync(outPath, JSON.stringify({ cat, results }, null, 2), 'utf-8');
  console.log(`Saved results to: ${outPath}`);
}

module.exports = { processCategory, generateFallback, searchUzumGraphQL };

if (require.main === module) {
  main().catch(console.error);
}
