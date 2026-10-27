import { Product } from "@/types";

export type ShowroomZone = "all" | "trimmers" | "hair_care" | "shavers" | "gadgets";

export interface ShowroomBillboardStand {
    id: string;
    zone: ShowroomZone;
    categoryTitleUz: string;
    categoryTitleRu: string;
    position: [number, number, number]; // [x, y, z] on podium table
    rotationY: number; // facing angle
    focusPosition: [number, number, number]; // Camera target when focusing
    lookAtPosition: [number, number, number]; // Where camera looks when focusing
    featuredProduct: Product; // Active product when inspected / clicked
    products: Product[]; // 2-3 products continuously scrolling on this screen
}

export const DOCK_TARGETS: Record<ShowroomZone, { cameraPos: [number, number, number]; lookAt: [number, number, number] }> = {
    all: {
        cameraPos: [0, 1.65, 8.5],
        lookAt: [0, 1.1, -0.5]
    },
    trimmers: {
        cameraPos: [-5.5, 1.65, 1.6],
        lookAt: [-5.5, 1.05, -0.5]
    },
    hair_care: {
        cameraPos: [0, 1.65, -2.2],
        lookAt: [0, 1.05, -4.5]
    },
    shavers: {
        cameraPos: [5.5, 1.65, 1.6],
        lookAt: [5.5, 1.05, -0.5]
    },
    gadgets: {
        cameraPos: [0, 1.65, 5.8],
        lookAt: [0, 1.05, 3.5]
    }
};

/**
 * DB'dagi haqiqiy tovarlar katalogi asosida showroom vitrina stendlarini generatsiya qilish.
 * Barcha test ma'lumotlari olib tashlangan - faqat DB tovarlari.
 */
export function buildShowroomStands(realProducts: Product[]): ShowroomBillboardStand[] {
    const pool = (realProducts && realProducts.length > 0) ? realProducts : [];

    // Fallback bitta tovar (agar DB bo'sh kelsa ham xato bermasligi uchun)
    const fallbackItem: Product = pool[0] || {
        id: "fallback-prod-1",
        name: "VGR Professional Series",
        name_uz: "VGR Professional Series",
        name_ru: "VGR Professional Series",
        price: 299000,
        image: "/showroom/box-front.png",
        category: "grooming",
        stock: 10,
        sales: 50,
        rating: 5,
        reviewCount: 20
    };

    const getItems = (bucket: Product[], startIdx: number, count: number): Product[] => {
        const res: Product[] = [];
        const source = bucket.length > 0 ? bucket : pool;
        const validSource = source.length > 0 ? source : [fallbackItem];
        for (let i = 0; i < count; i++) {
            const idx = (startIdx + i) % validSource.length;
            res.push(validSource[idx]);
        }
        return res;
    };

    // 1. Haqiqiy toifalarga ajratish
    const trimmers = pool.filter(p => {
        const cat = String((p as any).category_id || p.category || "");
        const name = ((p.name || "") + " " + (p.name_uz || "")).toLowerCase();
        return cat === "406" || cat === "407" || name.includes("trimmer") || name.includes("mashinka") || name.includes("soch kesish");
    });

    const hairCare = pool.filter(p => {
        const cat = String((p as any).category_id || p.category || "");
        const name = ((p.name || "") + " " + (p.name_uz || "")).toLowerCase();
        return cat === "403" || cat === "404" || cat === "402" || cat === "410" || cat === "411" || name.includes("fen") || name.includes("stayler") || name.includes("dazmol") || name.includes("styler");
    });

    const shavers = pool.filter(p => {
        const cat = String((p as any).category_id || p.category || "");
        const name = ((p.name || "") + " " + (p.name_uz || "")).toLowerCase();
        return cat === "408" || cat === "401" || cat === "412" || cat === "413" || cat === "430" || cat === "440" || name.includes("sheyver") || name.includes("britva") || name.includes("epil") || name.includes("ustara");
    });

    const gadgets = pool.filter(p => {
        return !trimmers.includes(p) && !hairCare.includes(p) && !shavers.includes(p);
    });

    const stands: ShowroomBillboardStand[] = [];

    // --- 1-STOL: TRIMMERLAR VA SOCH MASHINKALARI (Chap qanot, x = -5.5, z = -0.5) ---
    const tProds1 = getItems(trimmers, 0, 2);
    stands.push({
        id: "trimmers-stand-1",
        zone: "trimmers",
        categoryTitleUz: "Trimmerlar & Kantovka",
        categoryTitleRu: "Триммеры и Окантовка",
        position: [-6.7, 0.91, -0.5],
        rotationY: 0,
        focusPosition: [-6.7, 1.45, 0.7],
        lookAtPosition: [-6.7, 1.35, -0.5],
        featuredProduct: tProds1[0],
        products: tProds1
    });

    const tProds2 = getItems(trimmers, 2, 2);
    stands.push({
        id: "trimmers-stand-2",
        zone: "trimmers",
        categoryTitleUz: "Professional Trimmerlar",
        categoryTitleRu: "Профессиональные Триммеры",
        position: [-5.5, 0.91, -0.5],
        rotationY: 0,
        focusPosition: [-5.5, 1.45, 0.7],
        lookAtPosition: [-5.5, 1.35, -0.5],
        featuredProduct: tProds2[0],
        products: tProds2
    });

    const tProds3 = getItems(trimmers, 4, 2);
    stands.push({
        id: "trimmers-stand-3",
        zone: "trimmers",
        categoryTitleUz: "Soch Kesish Mashinkalari",
        categoryTitleRu: "Машинки для Стрижки",
        position: [-4.3, 0.91, -0.5],
        rotationY: 0,
        focusPosition: [-4.3, 1.45, 0.7],
        lookAtPosition: [-4.3, 1.35, -0.5],
        featuredProduct: tProds3[0],
        products: tProds3
    });

    // --- 2-STOL: FENLAR VA STAYLERLAR (Orqa markaz, x = 0.0, z = -4.5) ---
    const hProds1 = getItems(hairCare, 0, 2);
    stands.push({
        id: "haircare-stand-1",
        zone: "hair_care",
        categoryTitleUz: "Professional Fenlar",
        categoryTitleRu: "Профессиональные Фены",
        position: [-1.2, 0.91, -4.5],
        rotationY: 0,
        focusPosition: [-1.2, 1.45, -3.3],
        lookAtPosition: [-1.2, 1.35, -4.5],
        featuredProduct: hProds1[0],
        products: hProds1
    });

    const hProds2 = getItems(hairCare, 2, 2);
    stands.push({
        id: "haircare-stand-2",
        zone: "hair_care",
        categoryTitleUz: "Soch Dazmollari & Utijok",
        categoryTitleRu: "Утюжки и Выпрямители",
        position: [0.0, 0.91, -4.5],
        rotationY: 0,
        focusPosition: [0.0, 1.45, -3.3],
        lookAtPosition: [0.0, 1.35, -4.5],
        featuredProduct: hProds2[0],
        products: hProds2
    });

    const hProds3 = getItems(hairCare, 4, 2);
    stands.push({
        id: "haircare-stand-3",
        zone: "hair_care",
        categoryTitleUz: "Staylerlar & Fen-Cho'tkalar",
        categoryTitleRu: "Стайлеры и Фен-Щетки",
        position: [1.2, 0.91, -4.5],
        rotationY: 0,
        focusPosition: [1.2, 1.45, -3.3],
        lookAtPosition: [1.2, 1.35, -4.5],
        featuredProduct: hProds3[0],
        products: hProds3
    });

    // --- 3-STOL: SHEYVERLAR VA PARVARISH (O'ng qanot, x = 5.5, z = -0.5) ---
    const sProds1 = getItems(shavers, 0, 2);
    stands.push({
        id: "shavers-stand-1",
        zone: "shavers",
        categoryTitleUz: "Elektr Sheyverlar & Britvalar",
        categoryTitleRu: "Электробритвы и Шейверы",
        position: [4.3, 0.91, -0.5],
        rotationY: 0,
        focusPosition: [4.3, 1.45, 0.7],
        lookAtPosition: [4.3, 1.35, -0.5],
        featuredProduct: sProds1[0],
        products: sProds1
    });

    const sProds2 = getItems(shavers, 2, 2);
    stands.push({
        id: "shavers-stand-2",
        zone: "shavers",
        categoryTitleUz: "To'rli Ustaralar & Soqol",
        categoryTitleRu: "Сеточные Бритвы",
        position: [5.5, 0.91, -0.5],
        rotationY: 0,
        focusPosition: [5.5, 1.45, 0.7],
        lookAtPosition: [5.5, 1.35, -0.5],
        featuredProduct: sProds2[0],
        products: sProds2
    });

    const sProds3 = getItems(shavers, 4, 2);
    stands.push({
        id: "shavers-stand-3",
        zone: "shavers",
        categoryTitleUz: "Epilyatorlar & Parvarish",
        categoryTitleRu: "Эпиляторы и Уход",
        position: [6.7, 0.91, -0.5],
        rotationY: 0,
        focusPosition: [6.7, 1.45, 0.7],
        lookAtPosition: [6.7, 1.35, -0.5],
        featuredProduct: sProds3[0],
        products: sProds3
    });

    // --- 4-STOL: AUDIO, KALONKALAR VA GADJETLAR (Old orol, x = 0.0, z = 3.5) ---
    const gProds1 = getItems(gadgets, 0, 2);
    stands.push({
        id: "gadgets-stand-1",
        zone: "gadgets",
        categoryTitleUz: "Bluetooth Kalonkalar",
        categoryTitleRu: "Bluetooth Колонки",
        position: [-1.2, 0.91, 3.5],
        rotationY: 0,
        focusPosition: [-1.2, 1.45, 4.7],
        lookAtPosition: [-1.2, 1.35, 3.5],
        featuredProduct: gProds1[0],
        products: gProds1
    });

    const gProds2 = getItems(gadgets, 2, 2);
    stands.push({
        id: "gadgets-stand-2",
        zone: "gadgets",
        categoryTitleUz: "Quloqchinlar & Audio",
        categoryTitleRu: "Наушники и Аудио",
        position: [0.0, 0.91, 3.5],
        rotationY: 0,
        focusPosition: [0.0, 1.45, 4.7],
        lookAtPosition: [0.0, 1.35, 3.5],
        featuredProduct: gProds2[0],
        products: gProds2
    });

    const gProds3 = getItems(gadgets, 4, 2);
    stands.push({
        id: "gadgets-stand-3",
        zone: "gadgets",
        categoryTitleUz: "Aksessuarlar & Quvvatlash",
        categoryTitleRu: "Аксессуары и Зарядка",
        position: [1.2, 0.91, 3.5],
        rotationY: 0,
        focusPosition: [1.2, 1.45, 4.7],
        lookAtPosition: [1.2, 1.35, 3.5],
        featuredProduct: gProds3[0],
        products: gProds3
    });

    return stands;
}
