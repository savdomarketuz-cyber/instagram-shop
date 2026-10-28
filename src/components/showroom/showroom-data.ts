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
        cameraPos: [-19.0, 1.65, 3.0],
        lookAt: [0, 1.2, 0.0]
    },
    trimmers: {
        cameraPos: [-11.0, 1.65, -6.5],
        lookAt: [-11.0, 1.2, -10.5]
    },
    hair_care: {
        cameraPos: [8.5, 1.65, -6.5],
        lookAt: [8.5, 1.2, -10.5]
    },
    shavers: {
        cameraPos: [-11.0, 1.65, 7.5],
        lookAt: [-11.0, 1.2, 10.5]
    },
    gadgets: {
        cameraPos: [0.0, 1.65, 4.5],
        lookAt: [0.0, 1.1, 0.0]
    },
    exterior: {
        cameraPos: [-27.0, 1.70, 3.0],
        lookAt: [-22.0, 2.2, 3.0]
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

    // 1. MARKAZIY "MOBILE & TABLETS" DOIRAVIY OROL VA ARKASI (14 ta stend)
    // A) Markaziy doiraviy orol (Donut table: 6 ta stend)
    const centerRadius = 2.4;
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

    // B) Orqa yarimoy arka stoli (Crescent arch table: 4 ta stend)
    const arcX = [-2.2, -0.7, 0.7, 2.2];
    arcX.forEach((ax, idx) => {
        const item = getItem(gadgets, idx + 6);
        stands.push({
            id: `mobile-crescent-${idx + 1}`,
            zone: "gadgets",
            categoryTitleUz: "Planshetlar & iPad",
            categoryTitleRu: "Планшеты и iPad",
            position: [ax, 0.95, -2.8],
            rotationY: 0,
            focusPosition: [ax, 1.42, -1.6],
            lookAtPosition: [ax, 1.30, -2.8],
            product: item,
            images: getProductImages(item)
        });
    });

    // C) Chap va o'ng pod stollari (4 ta stend)
    [-3.8, 3.8].forEach((px, sideIdx) => {
        [0.0, 1.2].forEach((pz, podIdx) => {
            const item = getItem(gadgets, 10 + sideIdx * 2 + podIdx);
            stands.push({
                id: `mobile-pod-${sideIdx}-${podIdx}`,
                zone: "gadgets",
                categoryTitleUz: sideIdx === 0 ? "Smart Soatlar" : "Noutbuklar & Ultrabook",
                categoryTitleRu: sideIdx === 0 ? "Смарт-часы" : "Ноутбуки и Ультрабуки",
                position: [px, 0.95, pz],
                rotationY: px < 0 ? Math.PI / 2 : -Math.PI / 2,
                focusPosition: [px < 0 ? px + 1.2 : px - 1.2, 1.42, pz],
                lookAtPosition: [px, 1.30, pz],
                product: item,
                images: getProductImages(item)
            });
        });
    });

    // 2. "TV & SOUND" DEVOR VA UZUN STOLLARI (8 ta stend)
    // 2 ta uzun stol: z = -9.5 va z = -6.5
    const tvTableX = [5.0, 7.5, 10.0, 12.5];
    tvTableX.forEach((tx, idx) => {
        const item1 = getItem(pool, idx + 14);
        stands.push({
            id: `tv-table1-${idx + 1}`,
            zone: "all",
            categoryTitleUz: "TV & Katta Ekranlar",
            categoryTitleRu: "ТВ и Большие Экраны",
            position: [tx, 0.95, -9.5],
            rotationY: 0,
            focusPosition: [tx, 1.42, -8.3],
            lookAtPosition: [tx, 1.30, -9.5],
            product: item1,
            images: getProductImages(item1)
        });

        const item2 = getItem(pool, idx + 18);
        stands.push({
            id: `tv-table2-${idx + 1}`,
            zone: "all",
            categoryTitleUz: "Soundbar & Akustika",
            categoryTitleRu: "Саундбары и Акустика",
            position: [tx, 0.95, -6.5],
            rotationY: Math.PI,
            focusPosition: [tx, 1.42, -5.3],
            lookAtPosition: [tx, 1.30, -6.5],
            product: item2,
            images: getProductImages(item2)
        });
    });

    // 3. "KATTA MAISHIY TEXNIKALAR" (Shimoli-g'arbiy zal: 6 ta stend)
    const appXOffsets = [-15.0, -13.2, -11.4, -9.6, -7.8, -6.0];
    appXOffsets.forEach((xPos, idx) => {
        const item = getItem(pool, idx + 22);
        stands.push({
            id: `appliances-${idx + 1}`,
            zone: "all",
            categoryTitleUz: "Katta Maishiy Texnikalar",
            categoryTitleRu: "Крупная Бытовая Техника",
            position: [xPos, 0.95, -9.5],
            rotationY: 0,
            focusPosition: [xPos, 1.40, -8.1],
            lookAtPosition: [xPos, 1.30, -9.5],
            product: item,
            images: getProductImages(item)
        });
    });

    // 4. "OSHXONA VA MAYDA TEXNIKALAR" (Janubi-g'arbiy zal: 6 ta stend)
    const kitchenX = [-15.0, -13.2, -11.4, -9.6, -7.8, -6.0];
    kitchenX.forEach((xPos, idx) => {
        const item = getItem(trimmers, idx);
        stands.push({
            id: `kitchen-${idx + 1}`,
            zone: "trimmers",
            categoryTitleUz: "Oshxona & Professional Texnika",
            categoryTitleRu: "Техника для Кухни",
            position: [xPos, 0.95, 10.0],
            rotationY: Math.PI,
            focusPosition: [xPos, 1.40, 8.6],
            lookAtPosition: [xPos, 1.30, 10.0],
            product: item,
            images: getProductImages(item)
        });
    });

    // 5. "AKSESSUARLAR VA TARMOQ" (Janubiy markaziy zal: 6 ta stend)
    const accX = [4.5, 6.2, 7.9, 9.6, 11.3, 13.0];
    accX.forEach((xPos, idx) => {
        const item = getItem(shavers, idx);
        stands.push({
            id: `accessories-${idx + 1}`,
            zone: "shavers",
            categoryTitleUz: "Aksessuarlar & Tarmoq Qurilmalari",
            categoryTitleRu: "Аксессуары и Сеть",
            position: [xPos, 0.95, 10.0],
            rotationY: Math.PI,
            focusPosition: [xPos, 1.40, 8.6],
            lookAtPosition: [xPos, 1.30, 10.0],
            product: item,
            images: getProductImages(item)
        });
    });

    // 6. "CHECKOUT - KASSA VA PICK-UP" (Sharqiy zal: 4 ta stend)
    const checkX = [18.0, 20.0, 22.0, 24.0];
    checkX.forEach((xPos, idx) => {
        const item = getItem(hairCare, idx);
        stands.push({
            id: `checkout-stand-${idx + 1}`,
            zone: "hair_care",
            categoryTitleUz: "Kassa & Premium Mahsulotlar",
            categoryTitleRu: "Касса и Премиум",
            position: [xPos, 0.95, 0.0],
            rotationY: 0,
            focusPosition: [xPos, 1.40, 1.3],
            lookAtPosition: [xPos, 1.30, 0.0],
            product: item,
            images: getProductImages(item)
        });
    });

    // 7. "MIJOZLARGA XIZMAT VA SERVIS" (Janubi-sharqiy zal: 4 ta stend)
    const servX = [18.5, 20.5, 22.5, 24.5];
    servX.forEach((xPos, idx) => {
        const item = getItem(hairCare, idx + 4);
        stands.push({
            id: `service-stand-${idx + 1}`,
            zone: "hair_care",
            categoryTitleUz: "Kafolat & Servis Xizmati",
            categoryTitleRu: "Сервис и Гарантия",
            position: [xPos, 0.95, 8.5],
            rotationY: Math.PI,
            focusPosition: [xPos, 1.40, 7.1],
            lookAtPosition: [xPos, 1.30, 8.5],
            product: item,
            images: getProductImages(item)
        });
    });

    return stands;
}
