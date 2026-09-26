/**
 * SEO uchun matn yordamchilari (meta description, JSON-LD, Merchant feed).
 * Faqat chiqishdagi matnni tozalaydi — DB'dagi matnga tegmaydi.
 */

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
    ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

// Emoji va dekorativ belgilar (+ variation selector, ZWJ, keycap). RegExp konstruktori orqali:
// tsconfig target es5, \p{...} literal esa ES2018 talab qiladi — runtime (Node) uni qo'llaydi.
const EMOJI_RE = new RegExp('[\\p{Extended_Pictographic}\\uFE0F\\u200D\\u20E3]', 'gu');

// Extended_Pictographic ichida, lekin matn belgisi sifatida saqlanadi
const KEEP_SYMBOLS = new Set(['©', '®', '™']);

/** Markdown belgilarini olib tashlaydi, matn qoladi. Qatorlar hali bo'linmagan holda chaqiriladi. */
function stripMarkdown(text: string): string {
    return text
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')            // [matn](url) → matn
        .replace(/`([^`]*)`/g, '$1')                          // `kod` → kod
        .replace(/\*\*([\s\S]+?)\*\*/g, '$1')                 // **qalin**
        .replace(/__([\s\S]+?)__/g, '$1')                     // __qalin__
        .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2') // *kursiv*
        .replace(/(^|[^\w])_(?!\s)([^_\n]+?)_(?!\w)/g, '$1$2')    // _kursiv_ (snake_case'ga tegmaydi)
        .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')                 // # sarlavha
        .replace(/^[ \t]*[-*•][ \t]+/gm, '')                  // "- ", "* ", "• " ro'yxat
        .replace(/\*\*|__/g, '');                             // juftsiz qolgan belgilar
}

/**
 * Chiqish uchun matn tozalash: HTML teglari olib tashlanadi, entity'lar ochiladi,
 * emoji va Markdown belgilari olib tashlanadi, bo'shliqlar bitta probelga, trim().
 */
export function cleanText(value: unknown): string {
    if (typeof value !== 'string') return '';
    const decoded = value
        .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
            if (code[0] === '#') {
                const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
                return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : entity;
            }
            return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
        });
    const withoutEmoji = decoded.replace(EMOJI_RE, (ch) => (KEEP_SYMBOLS.has(ch) ? ch : ''));
    return stripMarkdown(withoutEmoji)
        .replace(/\s+/g, ' ')
        .trim();
}

/** So'z chegarasida qisqartiradi; kesilgan bo'lsa oxiriga "…" (natija ≤ max). */
export function truncateAtWord(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    return base.replace(/[\s,.;:!?—–-]+$/, '') + '…';
}

/** Tilga mos tozalangan tavsif — sahifa (meta, JSON-LD, yashirin blok) va feed uchun bir xil manba. */
export function getProductDescription(product: any, lang: string): string {
    const raw = lang === 'ru'
        ? (product.description_ru || product.description_uz || product.description)
        : (product.description_uz || product.description);
    return cleanText(raw);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

/** GS1 mod-10: o'ngdan ikkinchi raqamdan boshlab navbat bilan 3 va 1 ga ko'paytirib yig'iladi. */
function hasValidGs1CheckDigit(code: string): boolean {
    let sum = 0;
    for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
        sum += Number(code[i]) * weight;
    }
    return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}

/** GS1 20–29 — do'kon ichki/cheklangan diapazoni (Google qabul qilmaydi). */
function isRestrictedCirculation(code: string): boolean {
    if (code.length === 13 || code.length === 12) return code.startsWith('2');
    if (code.length === 14) return code.startsWith('02');
    return false;
}

function isValidGtin(code: string): boolean {
    return /^\d+$/.test(code)
        && GTIN_LENGTHS.has(code.length)
        && hasValidGs1CheckDigit(code)
        && !isRestrictedCirculation(code);
}

export interface ProductIdentifiers {
    gtin?: string;
    mpn?: string;
    brand?: string;
}

/**
 * Google uchun mahsulot identifikatorlari — faqat haqiqiy qiymatlar:
 *  gtin  — barcode faqat raqamlardan iborat, uzunligi 8/12/13/14, GS1 nazorat raqami
 *          to'g'ri va do'kon ichki diapazonida (GS1 20–29) emas bo'lsa
 *  mpn   — ishlab chiqaruvchi modeli (p.model); ichki artikul yoki id MPN emas
 *  brand — brands jadvalidagi haqiqiy nom (p.brand_name); UUID yoki "Velari" emas
 */
export function getProductIdentifiers(p: any): ProductIdentifiers {
    const ids: ProductIdentifiers = {};

    const barcode = typeof p?.barcode === 'string' ? p.barcode.trim() : String(p?.barcode ?? '').trim();
    if (isValidGtin(barcode)) ids.gtin = barcode;

    const model = typeof p?.model === 'string' ? p.model.trim() : '';
    if (model) ids.mpn = model;

    const brand = typeof p?.brand_name === 'string' ? p.brand_name.trim() : '';
    if (brand && !UUID_RE.test(brand) && brand.toLowerCase() !== 'velari') ids.brand = brand;

    return ids;
}
