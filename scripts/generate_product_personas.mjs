// Mahsulot-persona qatlami generatori.
//
// Har mahsulotga AI (Groq gpt-oss-120b) strukturali "persona" profilini yozadi:
//   kim uchun, qaysi holatda, qaysi mood, nimani to'ldiradi, obyektiv qadri,
//   va HALOL bitta jozibali jumla (one-liner). Bu cold-start mosligi uchun o'zak —
//   sotuv ma'lumotisiz ham mijoz niyatini mahsulotga semantik bog'lash imkonini beradi.
//
// Ishlatish:
//   node scripts/generate_product_personas.mjs            (faqat persona yo'q mahsulotlar)
//   node scripts/generate_product_personas.mjs --force    (hammasini qayta yozish)
//   node scripts/generate_product_personas.mjs --limit 10 (test uchun cheklov)

import { readFileSync } from 'fs';
import pg from 'pg';

// ── .env.local dan kalitlar ──
const env = readFileSync('.env.local', 'utf8');
const pick = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const DATABASE_URL = pick('DATABASE_URL');
const GROQ_KEYS = [pick('GROQ_API_KEY_1'), pick('GROQ_API_KEY_2'), pick('GROQ_API_KEY')].filter(Boolean);

if (!DATABASE_URL) { console.error('❌ DATABASE_URL topilmadi'); process.exit(1); }
if (GROQ_KEYS.length === 0) { console.error('❌ GROQ kaliti topilmadi'); process.exit(1); }

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

let keyIdx = 0;
const nextKey = () => { keyIdx = (keyIdx + 1) % GROQ_KEYS.length; return GROQ_KEYS[keyIdx]; };

const SYSTEM_PROMPT = `Sen Velari onlayn do'koni uchun mahsulot-tahlil mutaxassisisan.
Vazifang: bitta mahsulotni chuqur tushunib, uni KIM uchun, QAYSI holatda va NIMA his qilish uchun mosligini aniqlash.
Maqsad — keyinchalik mijoz niyatini shu mahsulotga to'g'ri moslashtirish (sotuv ma'lumotisiz ham).

QAT'IY HALOLLIK QOIDALARI:
- Hech qachon raqam, sotuv statistikasi yoki "eng zo'r/dunyoda birinchi" kabi tasdiqlanmagan da'vo TO'QIMA.
- one_liner faqat mahsulotning haqiqiy xususiyati va foydasiga asoslansin (ijtimoiy dalil emas).
- Faqat mahsulot ma'lumotidan kelib chiq, ortiqcha narsa o'ylab topma.

TIL QOIDASI (MUHIM):
- personas, use_cases, moods, occasions, value_props — BARCHASI faqat O'ZBEK tilida bo'lsin (inglizcha yoki ruscha so'z ishlatma).
- search_terms — uz va ru aralash bo'lishi mumkin (qidiruv uchun).
- one_liner_uz — o'zbekcha, one_liner_ru — ruscha.

JAVOB QAT'IY TOZA JSON, quyidagi strukturada:
{
  "personas": ["kim uchun — 3-5 ta qisqa segment, masalan: 'tunda ishlovchilar','talabalar','sportchilar'"],
  "use_cases": ["qaysi holat/maqsad — 3-5 ta, masalan: 'diqqatni jamlash','sayohat','uy ishlari'"],
  "moods": ["qanday his/holat beradi — 2-4 ta, masalan: 'tinchlik','energiya','ishonch'"],
  "complements": ["birga ishlatiladigan mahsulot turlari — 2-4 ta"],
  "value_props": ["obyektiv qadr/foyda — 3-5 ta aniq xususiyat"],
  "occasions": ["munosabat — masalan: 'sovg'a','kundalik','bayram'"],
  "search_terms": ["odam qidirishi mumkin bo'lgan so'zlar, uz va ru aralash — 5-10 ta"],
  "one_liner_uz": "Bitta halol, jozibali jumla — bu mahsulot kimga va nega mos (raqamsiz)",
  "one_liner_ru": "O'sha jumlaning ruscha varianti"
}`;

async function callGroq(productText) {
    for (let attempt = 0; attempt < GROQ_KEYS.length + 1; attempt++) {
        const key = GROQ_KEYS[keyIdx];
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: productText },
                    ],
                    temperature: 0.4,
                    response_format: { type: 'json_object' },
                }),
            });
            if (res.status === 429) { nextKey(); await new Promise(r => setTimeout(r, 1500)); continue; }
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error?.message || `HTTP ${res.status}`);
            }
            const data = await res.json();
            const content = data.choices[0].message.content;
            return JSON.parse(content.replace(/```json|```/g, '').trim());
        } catch (e) {
            if (attempt >= GROQ_KEYS.length) throw e;
            nextKey();
            await new Promise(r => setTimeout(r, 800));
        }
    }
    throw new Error('Groq: barcha kalitlar muvaffaqiyatsiz');
}

const c = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

try {
    // 1. Ustun mavjudligini ta'minlash (additive, xavfsiz)
    await c.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_persona jsonb`);
    await c.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_persona_updated_at timestamptz`);
    console.log('✅ ai_persona ustuni tayyor');

    // 2. Mahsulotlarni olish
    const where = FORCE ? 'is_deleted = false' : 'is_deleted = false AND ai_persona IS NULL';
    const limitSql = LIMIT ? `LIMIT ${LIMIT}` : '';
    const { rows: products } = await c.query(
        `SELECT id, name, name_uz, name_ru, description, description_uz, description_ru,
                category_id, brand_id, price
         FROM products WHERE ${where} ORDER BY sales DESC NULLS LAST ${limitSql}`
    );

    console.log(`📦 ${products.length} ta mahsulot uchun persona generatsiya qilinadi${FORCE ? ' (FORCE)' : ''}`);
    if (products.length === 0) { console.log('Hammasi tayyor.'); process.exit(0); }

    let done = 0, failed = 0;
    for (const p of products) {
        const text = [
            `Nomi: ${p.name_uz || p.name || ''}`,
            p.name_ru ? `Nomi (ru): ${p.name_ru}` : '',
            `Kategoriya: ${p.category_id || 'noma\'lum'}`,
            p.brand_id ? `Brend: ${p.brand_id}` : '',
            `Narxi: ${p.price} so'm`,
            `Tavsif: ${(p.description_uz || p.description || '').toString().substring(0, 800)}`,
        ].filter(Boolean).join('\n');

        try {
            const persona = await callGroq(text);
            await c.query(
                `UPDATE products SET ai_persona = $1, ai_persona_updated_at = now() WHERE id = $2`,
                [JSON.stringify(persona), p.id]
            );
            done++;
            process.stdout.write(`\r✅ ${done}/${products.length}  (xato: ${failed})   `);
        } catch (e) {
            failed++;
            console.error(`\n⚠️  ${p.id} (${p.name_uz || p.name}): ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 250)); // yengil throttle
    }

    console.log(`\n\n🎉 Tayyor: ${done} ta yozildi, ${failed} ta xato.`);
} catch (e) {
    console.error('❌ XATO:', e.message);
} finally {
    await c.end();
}
