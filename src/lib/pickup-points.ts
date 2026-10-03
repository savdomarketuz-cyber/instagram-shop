import rawPoints from "./data/pickup-points.json";

export interface PickupPoint {
    id: string;             // Masalan: "emu-182" yoki "bts-0108"
    provider: "bts" | "emu";
    name: string;           // "Angor ofisi" yoki "BTS YUNUSOBOD #0108"
    region_id: string;      // 14 ta viloyatimizdan biri: "tashkent_city", "samarkand", ...
    address: string;        // To'liq manzil
    landmark?: string;      // Mo'ljal
    phone: string;          // Telefon raqami
    schedule?: string;      // "Du-Sha: 09:00 - 18:00"
    lat: number;
    lng: number;
}

const PICKUP_POINTS: PickupPoint[] = rawPoints as PickupPoint[];

export function getAllPickupPoints(): PickupPoint[] {
    return PICKUP_POINTS;
}

export function getPickupPointsByRegion(regionId: string, provider?: "bts" | "emu"): PickupPoint[] {
    return PICKUP_POINTS.filter(p => {
        if (p.region_id !== regionId) return false;
        if (provider && p.provider !== provider) return false;
        return true;
    });
}

export function getPickupPointById(id: string): PickupPoint | undefined {
    return PICKUP_POINTS.find(p => p.id === id);
}
