export interface Region {
    id: string;
    name_uz: string;
    name_ru: string;
    defaultDays: number;
}

export const UZBEKISTAN_REGIONS: Region[] = [
    { id: "tashkent_city", name_uz: "Toshkent shahri", name_ru: "г. Ташкент", defaultDays: 1 },
    { id: "tashkent_region", name_uz: "Toshkent viloyati", name_ru: "Ташкентская область", defaultDays: 1 },
    { id: "andijan", name_uz: "Andijon", name_ru: "Андижан", defaultDays: 2 },
    { id: "bukhara", name_uz: "Buxoro", name_ru: "Бухара", defaultDays: 2 },
    { id: "fergana", name_uz: "Farg'ona", name_ru: "Фергана", defaultDays: 2 },
    { id: "jizzakh", name_uz: "Jizzax", name_ru: "Джизак", defaultDays: 2 },
    { id: "khorezm", name_uz: "Xorazm", name_ru: "Хорезм", defaultDays: 2 },
    { id: "namangan", name_uz: "Namangan", name_ru: "Наманган", defaultDays: 2 },
    { id: "navoiy", name_uz: "Navoiy", name_ru: "Навои", defaultDays: 2 },
    { id: "kashkadarya", name_uz: "Qashqadaryo", name_ru: "Кашкадарья", defaultDays: 2 },
    { id: "samarkand", name_uz: "Samarqand", name_ru: "Самарканд", defaultDays: 2 },
    { id: "sirdaryo", name_uz: "Sirdaryo", name_ru: "Сырдарья", defaultDays: 2 },
    { id: "surkhandarya", name_uz: "Surxondaryo", name_ru: "Сурхандарья", defaultDays: 2 },
    { id: "karakalpakstan", name_uz: "Qoraqalpog'iston Resp.", name_ru: "Респ. Каракалпакстан", defaultDays: 2 },
];

export const DEFAULT_REGION_ID = "tashkent_city";

export function getRegionById(id?: string): Region {
    return UZBEKISTAN_REGIONS.find(r => r.id === id) || UZBEKISTAN_REGIONS[0];
}

export function getDefaultRegionsDelivery(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const r of UZBEKISTAN_REGIONS) {
        map[r.id] = r.defaultDays;
    }
    return map;
}
