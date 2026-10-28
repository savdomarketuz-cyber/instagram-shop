import { Product } from "@/types";

export type ShowroomZone = "all" | "trimmers" | "hair_care" | "shavers" | "gadgets" | "exterior";

export interface ShowroomShowcaseStand {
    id: string;
    zone: ShowroomZone;
    categoryTitleUz: string;
    categoryTitleRu: string;
    position: [number, number, number]; // [x, y, z] on podium table
    rotationY: number; // 0 for front side (facing +Z), Math.PI for back side (facing -Z)
    focusPosition: [number, number, number]; // Camera target when focusing
    lookAtPosition: [number, number, number]; // Where camera looks when focusing
    product: Product; // Exactly 1 dedicated product per screen!
    images: string[]; // Barcha rasmlari (avtomatik slideshow uchun)
}

// Backwards compatibility alias
export type ShowroomBillboardStand = ShowroomShowcaseStand;

export const DOCK_TARGETS: Record<ShowroomZone, { cameraPos: [number, number, number]; lookAt: [number, number, number] }> = {
    all: {
        cameraPos: [-17.0, 1.65, 3.0],
        lookAt: [0, 1.2, 0.0]
    },
    trimmers: {
        cameraPos: [-9.5, 1.65, -4.5],
        lookAt: [-9.5, 1.2, -8.0]
    },
    hair_care: {
        cameraPos: [3.5, 1.65, -4.5],
        lookAt: [3.5, 1.2, -8.0]
    },
    shavers: {
        cameraPos: [-9.5, 1.65, 5.0],
        lookAt: [-9.5, 1.2, 8.5]
    },
    gadgets: {
        cameraPos: [0.0, 1.65, 4.2],
        lookAt: [0.0, 1.1, 0.0]
    },
    exterior: {
        cameraPos: [-26.0, 1.70, 3.0],
        lookAt: [-20.0, 2.2, 3.0]
    }
};

/**
 * Xarita diagrammasi bo'yicha 48 ta to'liq vitrina stendini zallarga aniq joylashtirish.
 * Markaziy doiraviy Mobile orol, TV & Sound devori, Katta maishiy texnikalar, Oshxona, Aksessuarlar va Kassa zonasi.
 */
export function buildShowroomStands(realProducts: Product[]): ShowroomShowcaseStand[] {
    const pool = (realProducts && realProducts.length > 0) ? realProducts : [];

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

    const getItem = (bucket: Product[], index: number): Product => {
        const source = bucket.length > 0 ? bucket : pool;
        const validSource = source.length > 0 ? source : [fallbackItem];
        return validSource[index % validSource.length];
    };

    const getProductImages = (prod: Product): string[] => {
        const imgs: string[] = [];
        if (prod.image) imgs.push(prod.image);
        if (prod.images && Array.isArray(prod.images)) {
            prod.images.forEach(img => {
                if (img && !imgs.includes(img)) imgs.push(img);
            });
        }
        return imgs.length > 0 ? imgs : ["/showroom/box-front.png"];
    };

    // Toifalarga ajratish
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

    const stands: ShowroomShowcaseStand[] = [];

    // 1. MARKAZIY "MOBILE & TABLETS" DOIRAVIY OROL (Center Island: x = 0, z = 0 - 6 ta stend)
    const centerRadius = 2.1;
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const posX = Math.sin(angle) * centerRadius;
        const posZ = Math.cos(angle) * centerRadius;
        const rotY = angle;
        const item = getItem(gadgets, i);

        stands.push({
            id: `center-mobile-${i + 1}`,
            zone: "gadgets",
            categoryTitleUz: "Mobil & Smart Gadjetlar",
            categoryTitleRu: "Смартфоны и Гаджеты",
            position: [posX, 0.95, posZ],
            rotationY: rotY,
            focusPosition: [posX + Math.sin(angle) * 1.3, 1.42, posZ + Math.cos(angle) * 1.3],
            lookAtPosition: [posX, 1.30, posZ],
            product: item,
            images: getProductImages(item)
        });
    }

    // 2. "TV & SOUND" DEVOR VITRINALARI (Top-Center Wall: z = -7.8 - 6 ta stend)
    const tvXOffsets = [0.0, 1.5, 3.0, 4.5, 6.0, 7.5];
    tvXOffsets.forEach((xPos, idx) => {
        const item = getItem(pool, idx + 8);
        stands.push({
            id: `tv-sound-${idx + 1}`,
            zone: "all",
            categoryTitleUz: "TV & Sound Tizimlari",
            categoryTitleRu: "ТВ и Аудиосистемы",
            position: [xPos, 1.05, -7.8],
            rotationY: 0,
            focusPosition: [xPos, 1.45, -6.4],
            lookAtPosition: [xPos, 1.35, -7.8],
            product: item,
            images: getProductImages(item)
        });
    });

    // 3. "KATTA MAISHIY TEXNIKALAR" (Top-Left Bay: x = -13 .. -7, z = -9.2 - 6 ta stend)
    const appXOffsets = [-13.0, -11.5, -10.0, -8.5, -7.0, -5.5];
    appXOffsets.forEach((xPos, idx) => {
        const item = getItem(pool, idx + 15);
        stands.push({
            id: `appliances-${idx + 1}`,
            zone: "all",
            categoryTitleUz: "Katta Maishiy Texnikalar",
            categoryTitleRu: "Крупная Бытовая Техника",
            position: [xPos, 0.95, -9.2],
            rotationY: 0,
            focusPosition: [xPos, 1.40, -7.8],
            lookAtPosition: [xPos, 1.30, -9.2],
            product: item,
            images: getProductImages(item)
        });
    });

    // 4. "TRIMMERLAR & SOCH PARVARISHI" (Left Wing Table: x = -9.5, z = -4.5 - 6 ta stend, 2 taraflama)
    const trimX = [-11.0, -9.5, -8.0];
    trimX.forEach((px, i) => {
        const itemF = getItem(trimmers, i);
        stands.push({
            id: `trimmers-f-${i + 1}`,
            zone: "trimmers",
            categoryTitleUz: "Professional Trimmerlar",
            categoryTitleRu: "Профессиональные Триммеры",
            position: [px, 0.92, -4.1],
            rotationY: 0,
            focusPosition: [px, 1.38, -2.9],
            lookAtPosition: [px, 1.30, -4.1],
            product: itemF,
            images: getProductImages(itemF)
        });

        const itemB = getItem(trimmers, i + 3);
        stands.push({
            id: `trimmers-b-${i + 1}`,
            zone: "trimmers",
            categoryTitleUz: "Soch Kesish Mashinkalari",
            categoryTitleRu: "Машинки для Стрижки",
            position: [px, 0.92, -4.9],
            rotationY: Math.PI,
            focusPosition: [px, 1.38, -6.1],
            lookAtPosition: [px, 1.30, -4.9],
            product: itemB,
            images: getProductImages(itemB)
        });
    });

    // 5. "OSHXONA VA MAYDA TEXNIKALAR" (Bottom-Left Bay: x = -13 .. -7, z = 9.2 - 6 ta stend)
    const kitchenX = [-13.0, -11.5, -10.0, -8.5, -7.0, -5.5];
    kitchenX.forEach((xPos, idx) => {
        const item = getItem(pool, idx + 22);
        stands.push({
            id: `kitchen-${idx + 1}`,
            zone: "shavers",
            categoryTitleUz: "Oshxona & Mayda Texnikalar",
            categoryTitleRu: "Техника для Кухни",
            position: [xPos, 0.95, 9.2],
            rotationY: Math.PI,
            focusPosition: [xPos, 1.40, 7.8],
            lookAtPosition: [xPos, 1.30, 9.2],
            product: item,
            images: getProductImages(item)
        });
    });

    // 6. "SHEYVERLAR & PARVARISH" (Bottom-Left Gondola: x = -9.5, z = 5.0 - 6 ta stend, 2 taraflama)
    trimX.forEach((px, i) => {
        const itemF = getItem(shavers, i);
        stands.push({
            id: `shavers-f-${i + 1}`,
            zone: "shavers",
            categoryTitleUz: "Sheyverlar & Ustara",
            categoryTitleRu: "Шейверы и Бритвы",
            position: [px, 0.92, 5.4],
            rotationY: 0,
            focusPosition: [px, 1.38, 6.6],
            lookAtPosition: [px, 1.30, 5.4],
            product: itemF,
            images: getProductImages(itemF)
        });

        const itemB = getItem(shavers, i + 3);
        stands.push({
            id: `shavers-b-${i + 1}`,
            zone: "shavers",
            categoryTitleUz: "Erkaklar Parvarishi",
            categoryTitleRu: "Мужской Уход",
            position: [px, 0.92, 4.6],
            rotationY: Math.PI,
            focusPosition: [px, 1.38, 3.4],
            lookAtPosition: [px, 1.30, 4.6],
            product: itemB,
            images: getProductImages(itemB)
        });
    });

    // 7. "AKSESSUARLAR VA TARMOQ" (Bottom-Center Gondola: x = 6.0, z = 8.5 - 6 ta stend)
    const accX = [3.5, 5.0, 6.5, 8.0, 9.5, 11.0];
    accX.forEach((xPos, idx) => {
        const item = getItem(gadgets, idx + 6);
        stands.push({
            id: `accessories-${idx + 1}`,
            zone: "gadgets",
            categoryTitleUz: "Aksessuarlar & Tarmoq",
            categoryTitleRu: "Аксессуары и Сеть",
            position: [xPos, 0.95, 8.5],
            rotationY: Math.PI,
            focusPosition: [xPos, 1.40, 7.1],
            lookAtPosition: [xPos, 1.30, 8.5],
            product: item,
            images: getProductImages(item)
        });
    });

    // 8. "CHECKOUT & SERVIS KASSA" (Right Wing: x = 18.0, z = 0.0 - 6 ta stend)
    const checkZ = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
    checkZ.forEach((zPos, idx) => {
        const item = getItem(hairCare, idx);
        stands.push({
            id: `checkout-stand-${idx + 1}`,
            zone: "hair_care",
            categoryTitleUz: "Fenlar & Premium Aksessuarlar",
            categoryTitleRu: "Фены и Аксессуары",
            position: [18.0, 0.95, zPos],
            rotationY: -Math.PI / 2, // G'arbga (ichkariga) qaragan
            focusPosition: [16.6, 1.40, zPos],
            lookAtPosition: [18.0, 1.30, zPos],
            product: item,
            images: getProductImages(item)
        });
    });

    return stands;
}
