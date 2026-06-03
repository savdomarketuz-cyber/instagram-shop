/**
 * Qidiruv so'rovini normalizatsiya qilish — typo, transliteratsiya va sinonimlar.
 * Tashqi API'siz, darhol ishlaydi (0ms). O'zbek/Rus elektron savdo uchun moslangan.
 */

// Brend transliteratsiyasi: kirill/lotin/typo → kanonik
const BRAND_MAP: Record<string, string> = {
    // Apple
    "ayfon": "iPhone", "айфон": "iPhone", "iphone": "iPhone", "ifon": "iPhone",
    "apple": "Apple", "айпад": "iPad", "ipad": "iPad", "aypad": "iPad",
    "макбук": "MacBook", "makbuk": "MacBook", "macbook": "MacBook",
    "эйрподс": "AirPods", "эирподс": "AirPods", "airpods": "AirPods", "erpods": "AirPods",
    "airpod": "AirPods", "arpods": "AirPods", "arpod": "AirPods", "ayrpods": "AirPods", "ayrpod": "AirPods",
    "podsmax": "Pods Max", "клиппер": "clipper", "клипер": "clipper", "kliper": "clipper",
    // Samsung
    "самсунг": "Samsung", "samsung": "Samsung", "samsng": "Samsung", "самсунк": "Samsung",
    "галакси": "Galaxy", "galaxy": "Galaxy", "galaksi": "Galaxy",
    // Xiaomi
    "сяоми": "Xiaomi", "xiaomi": "Xiaomi", "shaomi": "Xiaomi", "ксиоми": "Xiaomi", "siyomi": "Xiaomi",
    "редми": "Redmi", "redmi": "Redmi", "poco": "Poco", "поко": "Poco",
    // Boshqalar
    "хуавей": "Huawei", "huawei": "Huawei", "хонор": "Honor", "honor": "Honor",
    "реалми": "Realme", "realme": "Realme", "оппо": "Oppo", "oppo": "Oppo", "виво": "Vivo", "vivo": "Vivo",
    "ноутбук": "noutbuk", "notebook": "noutbuk", "laptop": "noutbuk",
};

// Mahsulot turi sinonimlari (uz/ru aralash)
const SYNONYM_MAP: Record<string, string> = {
    "telefon": "smartfon", "телефон": "smartfon", "smartphone": "smartfon",
    "naushnik": "quloqchin", "наушник": "quloqchin", "headphone": "quloqchin", "earphone": "quloqchin",
    "soatlar": "soat", "часы": "soat", "watch": "soat", "smartwatch": "soat",
    "kompyuter": "kompyuter", "комп": "kompyuter", "pc": "kompyuter",
    "zaryadnik": "zaryad", "зарядка": "zaryad", "charger": "zaryad",
    "kabel": "kabel", "кабель": "kabel", "cable": "kabel", "provod": "kabel",
    "soch olish": "trimmer", "soch kesish": "trimmer", "mashinka": "trimmer", "стрижка": "trimmer",
    "fen": "fen", "фен": "fen", "hairdryer": "fen",
};

// Kirill → lotin transliteratsiya jadvali (uz/ru). Fallback uchun:
// agar kirillcha so'rov natija bermasa, lotincha shaklini ham sinaymiz
// (mahsulot nomlari ko'pincha lotin: "клиппер" → "klipper" ≈ "clipper").
const CYRILLIC_MAP: Record<string, string> = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh",
    "ъ": "", "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "қ": "q", "ғ": "g", "ҳ": "h", "ў": "o",
};

/** Matndagi kirill harflarni lotinga o'giradi. Lotin/raqamlar tegmaydi. */
export function transliterateLatin(raw: string): string {
    const s = (raw || "").toLowerCase();
    let out = "";
    let hadCyrillic = false;
    for (const ch of s) {
        if (CYRILLIC_MAP[ch] !== undefined) { out += CYRILLIC_MAP[ch]; hadCyrillic = true; }
        else out += ch;
    }
    return hadCyrillic ? out : raw;
}

export function normalizeQuery(raw: string): string {
    const q = (raw || "").trim();
    if (!q) return q;

    const lower = q.toLowerCase();

    // 1) To'liq so'rov brend xaritasida bo'lsa
    if (BRAND_MAP[lower]) return BRAND_MAP[lower];
    if (SYNONYM_MAP[lower]) return SYNONYM_MAP[lower];

    // 2) So'zma-so'z almashtirish
    const words = lower.split(/\s+/);
    const mapped = words.map(w => BRAND_MAP[w] || SYNONYM_MAP[w] || w);

    // Agar hech narsa o'zgarmasa, original (katta-kichik harf) qaytariladi —
    // trigram qidiruv kichik typo'larni o'zi ushlaydi
    const result = mapped.join(" ");
    return result === lower ? q : result;
}
