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
        cameraPos: [0, 1.65, 11.0],
        lookAt: [0, 1.2, 0.0]
    },
    trimmers: {
        cameraPos: [-6.5, 1.65, 2.5],
        lookAt: [-6.5, 1.1, -0.5]
    },
    hair_care: {
        cameraPos: [6.5, 1.65, -4.5],
        lookAt: [6.5, 1.1, -7.0]
    },
    shavers: {
        cameraPos: [-6.5, 1.65, 8.5],
        lookAt: [-6.5, 1.1, 6.0]
    },
    gadgets: {
        cameraPos: [0.0, 1.65, 3.8],
        lookAt: [0.0, 1.1, 0.0]
    },
    exterior: {
        cameraPos: [0, 1.70, 22.0],
        lookAt: [0, 2.6, 14.0]
    }
};

/**
 * Namuna arxitektura diagrammasi asosida zallarga ajratilgan 48 ta to'liq vitrina stendini qurish.
 * Har bir zona (Markaziy Doira orol, TV & Sound, Trimmerlar, Fenlar, Sheyverlar, Kassa) o'ziga xos stendlarga ega.
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

    // 1. MARKAZIY "MOBILE & GADGETS" DOIRAVIY OROL (Center Horseshoe / Circle Island - 6 ta stend)
    const centerRadius = 2.4;
    for (let i = 0; i < 6; i++) {
        // Doira bo'ylab 60 gradusdan joylashtirish
        const angle = (i * Math.PI) / 3;
        const posX = Math.sin(angle) * centerRadius;
        const posZ = Math.cos(angle) * centerRadius;
        // Tashqariga qaragan
        const rotY = angle;
        const item = getItem(gadgets, i);

        stands.push({
            id: `center-island-${i + 1}`,
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

    // 2. ORQA DEVOR BO'YIDAGI "TV & SOUND" BO'LIMI (Top Wall - 6 ta stend)
    const tvXOffsets = [-5.0, -3.0, -1.0, 1.0, 3.0, 5.0];
    tvXOffsets.forEach((xPos, idx) => {
        const item = getItem(pool, idx + 10);
        stands.push({
            id: `tv-sound-${idx + 1}`,
            zone: "all",
            categoryTitleUz: "TV & Sound Tizimlari",
            categoryTitleRu: "ТВ и Аудиосистемы",
            position: [xPos, 1.05, -11.0],
            rotationY: 0, // Janubga (kirishga) qaragan
            focusPosition: [xPos, 1.45, -9.6],
            lookAtPosition: [xPos, 1.35, -11.0],
            product: item,
            images: getProductImages(item)
        });
    });

    // 3. CHAP QANOT "TRIMMERLAR & SOCH" (Left Wing - 2 ta stol x 6 tadan = 12 ta stend)
    const addDoubleSidedTable = (
        tableId: string,
        zone: ShowroomZone,
        titleUz: string,
        titleRu: string,
        centerX: number,
        centerZ: number,
        bucket: Product[],
        startIdx: number
    ) => {
        const xOffs = [-1.3, 0.0, 1.3];
        const zFront = centerZ + 0.45;
        const zBack = centerZ - 0.45;

        // Old tomon (Kirishga qaraydi)
        xOffs.forEach((xOff, i) => {
            const px = centerX + xOff;
            const item = getItem(bucket, startIdx + i);
            stands.push({
                id: `${tableId}-f-${i + 1}`,
                zone,
                categoryTitleUz: titleUz,
                categoryTitleRu: titleRu,
                position: [px, 0.92, zFront],
                rotationY: 0,
                focusPosition: [px, 1.38, zFront + 1.2],
                lookAtPosition: [px, 1.30, zFront],
                product: item,
                images: getProductImages(item)
            });
        });

        // Orqa tomon (Devorga qaraydi)
        xOffs.forEach((xOff, i) => {
            const px = centerX + xOff;
            const item = getItem(bucket, startIdx + i + 3);
            stands.push({
                id: `${tableId}-b-${i + 1}`,
                zone,
                categoryTitleUz: titleUz,
                categoryTitleRu: titleRu,
                position: [px, 0.92, zBack],
                rotationY: Math.PI,
                focusPosition: [px, 1.38, zBack - 1.2],
                lookAtPosition: [px, 1.30, zBack],
                product: item,
                images: getProductImages(item)
            });
        });
    };

    // Trimmerlar 1-stol (Old chap: x = -6.5, z = 0.5)
    addDoubleSidedTable("trimmers-front", "trimmers", "Professional Trimmerlar", "Профессиональные Триммеры", -6.5, 0.5, trimmers, 0);

    // Trimmerlar 2-stol (Orqa chap: x = -6.5, z = -5.0)
    addDoubleSidedTable("trimmers-rear", "trimmers", "Soch Kesish Mashinkalari", "Машинки для Стрижки", -6.5, -5.0, trimmers, 6);

    // 4. "SHEYVERLAR & PARVARISH" (Bottom Left Gondola: x = -6.5, z = 6.0 - 6 ta stend)
    addDoubleSidedTable("shavers-island", "shavers", "Sheyverlar & Ustara", "Шейверы и Бритвы", -6.5, 6.0, shavers, 0);

    // 5. O'NG QANOT "FENLAR & GO'ZALLIK" (Right Wing Top: x = 6.5, z = -5.5 - 6 ta stend)
    addDoubleSidedTable("haircare-island", "hair_care", "Fenlar & Staylerlar", "Фены и Стайлеры", 6.5, -5.5, hairCare, 0);

    // 6. "AKSESSUARLAR & BLUETOOTH AUDIO" (Right Wing Center: x = 6.5, z = 0.5 - 6 ta stend)
    addDoubleSidedTable("audio-island", "gadgets", "Audio & Quloqchinlar", "Наушники и Аудио", 6.5, 0.5, gadgets, 6);

    // 7. "CHECKOUT & SERVIS ZONASI" (Far Right Service Area: x = 11.5, z = 1.0 - 6 ta stend)
    addDoubleSidedTable("checkout-zone", "all", "Kassa & Premium Aksessuarlar", "Касса и Аксессуары", 11.5, 1.0, pool, 24);

    return stands;
}
