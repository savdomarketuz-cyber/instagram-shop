import { Product } from "@/types";

export type ShowroomZone = "all" | "trimmers" | "hair_care" | "shavers" | "gadgets";

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
}

// Backwards compatibility alias
export type ShowroomBillboardStand = ShowroomShowcaseStand;

export const DOCK_TARGETS: Record<ShowroomZone, { cameraPos: [number, number, number]; lookAt: [number, number, number] }> = {
    all: {
        cameraPos: [0, 1.65, 8.5],
        lookAt: [0, 1.1, -0.5]
    },
    trimmers: {
        cameraPos: [-5.5, 1.65, 1.8],
        lookAt: [-5.5, 1.1, -0.5]
    },
    hair_care: {
        cameraPos: [0, 1.65, -2.4],
        lookAt: [0, 1.1, -4.5]
    },
    shavers: {
        cameraPos: [5.5, 1.65, 1.8],
        lookAt: [5.5, 1.1, -0.5]
    },
    gadgets: {
        cameraPos: [0, 1.65, 6.0],
        lookAt: [0, 1.1, 3.5]
    }
};

/**
 * DB'dagi haqiqiy tovarlar asosida 4 ta stol va har bir stolda 2 taraflama (3 tadan = 6 ta mahsulot) vitrina stendlarini qurish.
 * Jami 24 ta alohida mahsulot stendi. Har bir ekranda faqat 1 ta mahsulot chiqadi.
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

    // Helper: Stolga 2 tarafdan 3 tadan (jami 6 ta) stend joylash
    const addTableStands = (
        tableId: string,
        zone: ShowroomZone,
        titleUz: string,
        titleRu: string,
        centerX: number,
        centerZ: number,
        bucket: Product[]
    ) => {
        const xOffsets = [-1.3, 0.0, 1.3];
        const zSouth = centerZ + 0.42; // 1-tomon (Old tomon: z kattaroq, kirishga (+Z) qaraydi, rotationY = 0)
        const zNorth = centerZ - 0.42; // 2-tomon (Orqa tomon: z kichikroq, devorga (-Z) qaraydi, rotationY = Math.PI)

        // 1-Taraf (Old tomon - South): 3 ta tovar (Old tomonga qaragan, rotationY = 0)
        xOffsets.forEach((xOff, i) => {
            const posX = centerX + xOff;
            stands.push({
                id: `${tableId}-front-${i + 1}`,
                zone,
                categoryTitleUz: titleUz,
                categoryTitleRu: titleRu,
                position: [posX, 0.91, zSouth],
                rotationY: 0,
                focusPosition: [posX, 1.38, zSouth + 1.15],
                lookAtPosition: [posX, 1.30, zSouth],
                product: getItem(bucket, i)
            });
        });

        // 2-Taraf (Orqa tomon - North): 3 ta tovar (Orqa tomonga qaragan, rotationY = Math.PI)
        xOffsets.forEach((xOff, i) => {
            const posX = centerX + xOff;
            stands.push({
                id: `${tableId}-back-${i + 1}`,
                zone,
                categoryTitleUz: titleUz,
                categoryTitleRu: titleRu,
                position: [posX, 0.91, zNorth],
                rotationY: Math.PI,
                focusPosition: [posX, 1.38, zNorth - 1.15],
                lookAtPosition: [posX, 1.30, zNorth],
                product: getItem(bucket, i + 3)
            });
        });
    };

    // 1-STOL: Trimmerlar (Chap qanot: x = -5.5, z = -0.5) - 6 ta mahsulot
    addTableStands("trimmers", "trimmers", "Trimmerlar & Soch", "Триммеры и Стрижка", -5.5, -0.5, trimmers);

    // 2-STOL: Fenlar & Staylerlar (Orqa markaz: x = 0.0, z = -4.5) - 6 ta mahsulot
    addTableStands("haircare", "hair_care", "Fenlar & Staylerlar", "Фены и Стайлеры", 0.0, -4.5, hairCare);

    // 3-STOL: Sheyverlar & Parvarish (O'ng qanot: x = 5.5, z = -0.5) - 6 ta mahsulot
    addTableStands("shavers", "shavers", "Sheyverlar & Parvarish", "Шейверы и Уход", 5.5, -0.5, shavers);

    // 4-STOL: Audio & Gadjetlar (Old orol: x = 0.0, z = 3.5) - 6 ta mahsulot
    addTableStands("gadgets", "gadgets", "Audio & Aksessuarlar", "Аудио и Аксессуары", 0.0, 3.5, gadgets);

    return stands;
}
