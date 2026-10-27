import { Product } from "@/types";

export type ShowroomZone = "all" | "smartphones" | "audio_wearables" | "gaming_gadgets";

export interface ShowroomItemConfig {
    id: string;
    zone: ShowroomZone;
    position: [number, number, number]; // [x, y, z] on podium
    focusPosition: [number, number, number]; // Camera target when focusing
    lookAtPosition: [number, number, number]; // Where camera looks when focusing
    defaultProduct: Product;
    modelType: "iphone" | "samsung" | "airpods" | "watch" | "ps5" | "drone";
}

export const SHOWROOM_ITEMS: ShowroomItemConfig[] = [
    {
        id: "iphone-16-pro-max",
        zone: "smartphones",
        position: [-6.3, 0.9, -0.5],
        focusPosition: [-6.3, 1.45, 0.8],
        lookAtPosition: [-6.3, 1.05, -0.5],
        modelType: "iphone",
        defaultProduct: {
            id: "sr-iphone-16-pro-max",
            name: "Apple iPhone 16 Pro Max 256GB Desert Titanium",
            name_uz: "Apple iPhone 16 Pro Max 256GB Desert Titanium",
            name_ru: "Apple iPhone 16 Pro Max 256GB Desert Titanium",
            price: 15499000,
            oldPrice: 16999000,
            image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80",
            category: "smartphones",
            category_uz: "Smartfonlar",
            category_ru: "Смартфоны",
            description: "Titan korpusli eng quvvatli iPhone. A18 Pro protsessor, yangi Camera Control tugmasi va batareyaning aqlbovar qilmas ishlash vaqti.",
            description_uz: "Titan korpusli eng quvvatli iPhone. A18 Pro protsessor, yangi Camera Control tugmasi va batareyaning aqlbovar qilmas ishlash vaqti.",
            description_ru: "Самый мощный iPhone в титановом корпусе. Процессор A18 Pro, новая кнопка Camera Control и непревзойденная автономность.",
            stock: 12,
            sales: 85,
            rating: 5,
            reviewCount: 38
        }
    },
    {
        id: "samsung-s24-ultra",
        zone: "smartphones",
        position: [-4.7, 0.9, -0.5],
        focusPosition: [-4.7, 1.45, 0.8],
        lookAtPosition: [-4.7, 1.05, -0.5],
        modelType: "samsung",
        defaultProduct: {
            id: "sr-samsung-s24-ultra",
            name: "Samsung Galaxy S24 Ultra 512GB Titanium Black",
            name_uz: "Samsung Galaxy S24 Ultra 512GB Titanium Black",
            name_ru: "Samsung Galaxy S24 Ultra 512GB Titanium Black",
            price: 14200000,
            oldPrice: 15300000,
            image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80",
            category: "smartphones",
            category_uz: "Smartfonlar",
            category_ru: "Смартфоны",
            description: "Galaxy AI imkoniyatlari, titan ramka, 200MP kamera va o'rnatilgan S-Pen stilusli flagman smartfon.",
            description_uz: "Galaxy AI imkoniyatlari, titan ramka, 200MP kamera va o'rnatilgan S-Pen stilusli flagman smartfon.",
            description_ru: "Флагман со встроенным искусственным интеллектом Galaxy AI, титановым корпусом, камерой 200МП и пером S-Pen.",
            stock: 8,
            sales: 64,
            rating: 4.9,
            reviewCount: 29
        }
    },
    {
        id: "airpods-max",
        zone: "audio_wearables",
        position: [-0.8, 0.9, -4.5],
        focusPosition: [-0.8, 1.45, -3.2],
        lookAtPosition: [-0.8, 1.1, -4.5],
        modelType: "airpods",
        defaultProduct: {
            id: "sr-airpods-max",
            name: "Apple AirPods Max Wireless Headphones Space Gray",
            name_uz: "Apple AirPods Max Wireless Headphones Space Gray",
            name_ru: "Беспроводные наушники Apple AirPods Max Space Gray",
            price: 6890000,
            oldPrice: 7500000,
            image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80",
            category: "audio",
            category_uz: "Audio & Quloqchinlar",
            category_ru: "Аудио и наушники",
            description: "Yuqori aniqlikdagi Hi-Fi audio, faol shovqinni to'sish (ANC) va shaffoflik rejimi bilan mukammal quloqchin.",
            description_uz: "Yuqori aniqlikdagi Hi-Fi audio, faol shovqinni to'sish (ANC) va shaffoflik rejimi bilan mukammal quloqchin.",
            description_ru: "Высококачественный Hi-Fi звук, активное шумоподавление (ANC) и режим прозрачности в культовом дизайне.",
            stock: 15,
            sales: 92,
            rating: 4.9,
            reviewCount: 44
        }
    },
    {
        id: "apple-watch-ultra-2",
        zone: "audio_wearables",
        position: [0.8, 0.9, -4.5],
        focusPosition: [0.8, 1.45, -3.2],
        lookAtPosition: [0.8, 1.05, -4.5],
        modelType: "watch",
        defaultProduct: {
            id: "sr-apple-watch-ultra-2",
            name: "Apple Watch Ultra 2 GPS + Cellular 49mm Titanium",
            name_uz: "Apple Watch Ultra 2 GPS + Cellular 49mm Titanium",
            name_ru: "Apple Watch Ultra 2 GPS + Cellular 49mm Titanium",
            price: 9350000,
            oldPrice: 10100000,
            image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80",
            category: "smartwatches",
            category_uz: "Aqlli soatlar",
            category_ru: "Умные часы",
            description: "Ekstremal sharoitlar va sportchilar uchun yaratilgan 49mm titan korpusli eng baquvvat Apple Watch.",
            description_uz: "Ekstremal sharoitlar va sportchilar uchun yaratilgan 49mm titan korpusli eng baquvvat Apple Watch.",
            description_ru: "Самые прочные Apple Watch в корпусе 49 мм из титана, созданные для экстремальных нагрузок и приключений.",
            stock: 10,
            sales: 47,
            rating: 5,
            reviewCount: 19
        }
    },
    {
        id: "playstation-5-slim",
        zone: "gaming_gadgets",
        position: [4.7, 0.9, -0.5],
        focusPosition: [4.7, 1.45, 0.8],
        lookAtPosition: [4.7, 1.1, -0.5],
        modelType: "ps5",
        defaultProduct: {
            id: "sr-playstation-5-slim",
            name: "Sony PlayStation 5 Slim 1TB Digital Edition White",
            name_uz: "Sony PlayStation 5 Slim 1TB Digital Edition White",
            name_ru: "Sony PlayStation 5 Slim 1TB Digital Edition White",
            price: 6490000,
            oldPrice: 7100000,
            image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80",
            category: "gaming",
            category_uz: "O'yin konsollari",
            category_ru: "Игровые приставки",
            description: "Yangi ixcham dizayn, 1TB tezkor SSD va DualSense haptik boshqaruvi bilan keyingi avlod geyming tajribasi.",
            description_uz: "Yangi ixcham dizayn, 1TB tezkor SSD va DualSense haptik boshqaruvi bilan keyingi avlod geyming tajribasi.",
            description_ru: "Компактный дизайн, быстрый накопитель SSD 1TB и революционный геймпад DualSense с тактильной отдачей.",
            stock: 14,
            sales: 112,
            rating: 5,
            reviewCount: 76
        }
    },
    {
        id: "dji-mini-4-pro",
        zone: "gaming_gadgets",
        position: [6.3, 0.9, -0.5],
        focusPosition: [6.3, 1.45, 0.8],
        lookAtPosition: [6.3, 1.05, -0.5],
        modelType: "drone",
        defaultProduct: {
            id: "sr-dji-mini-4-pro",
            name: "DJI Mini 4 Pro Drone Fly More Combo RC 2",
            name_uz: "DJI Mini 4 Pro Drone Fly More Combo RC 2",
            name_ru: "Квадрокоптер DJI Mini 4 Pro Fly More Combo RC 2",
            price: 11800000,
            oldPrice: 12900000,
            image: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80",
            category: "drones",
            category_uz: "Dronlar & Gadjetlar",
            category_ru: "Дроны и гаджеты",
            description: "4K/60fps HDR video, barcha yo'nalishli to'siqlarni aniqlash tizimi va 34 daqiqagacha uzoq parvoz.",
            description_uz: "4K/60fps HDR video, barcha yo'nalishli to'siqlarni aniqlash tizimi va 34 daqiqagacha uzoq parvoz.",
            description_ru: "Съемка 4K/60fps HDR, всенаправленное распознавание препятствий и до 34 минут чистого полета.",
            stock: 6,
            sales: 31,
            rating: 4.8,
            reviewCount: 15
        }
    }
];

export const DOCK_TARGETS: Record<ShowroomZone, { cameraPos: [number, number, number]; lookAt: [number, number, number] }> = {
    all: {
        cameraPos: [0, 3.2, 9.5],
        lookAt: [0, 1.1, -1.0]
    },
    smartphones: {
        cameraPos: [-5.5, 2.0, 2.8],
        lookAt: [-5.5, 1.0, -0.5]
    },
    audio_wearables: {
        cameraPos: [0, 2.0, -1.2],
        lookAt: [0, 1.0, -4.5]
    },
    gaming_gadgets: {
        cameraPos: [5.5, 2.0, 2.8],
        lookAt: [5.5, 1.0, -0.5]
    }
};

/**
 * DB'dan kelgan haqiqiy tovarlar bilan showroom konfiguratsiyasini boyitish
 */
export function mergeWithRealProducts(configs: ShowroomItemConfig[], realProducts: Product[]): { config: ShowroomItemConfig; product: Product }[] {
    if (!realProducts || realProducts.length === 0) {
        return configs.map(cfg => ({ config: cfg, product: cfg.defaultProduct }));
    }

    return configs.map(cfg => {
        let matched: Product | undefined;

        if (cfg.modelType === "iphone") {
            matched = realProducts.find(p => p.name?.toLowerCase().includes("iphone") || p.name_uz?.toLowerCase().includes("iphone"));
        } else if (cfg.modelType === "samsung") {
            matched = realProducts.find(p => p.name?.toLowerCase().includes("samsung") || p.name?.toLowerCase().includes("galaxy"));
        } else if (cfg.modelType === "airpods") {
            matched = realProducts.find(p => p.name?.toLowerCase().includes("airpods") || p.name?.toLowerCase().includes("headphone") || p.category?.includes("audio"));
        } else if (cfg.modelType === "watch") {
            matched = realProducts.find(p => p.name?.toLowerCase().includes("watch") || p.category?.includes("watch"));
        } else if (cfg.modelType === "ps5") {
            matched = realProducts.find(p => p.name?.toLowerCase().includes("playstation") || p.name?.toLowerCase().includes("ps5") || p.category?.includes("game"));
        } else if (cfg.modelType === "drone") {
            matched = realProducts.find(p => p.name?.toLowerCase().includes("dji") || p.name?.toLowerCase().includes("dron") || p.category?.includes("gadget"));
        }

        return {
            config: cfg,
            product: matched || cfg.defaultProduct
        };
    });
}
