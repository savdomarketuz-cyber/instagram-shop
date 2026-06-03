/**
 * Yandex Metrika markazlashgan helper.
 * Hisoblagich init YandexMetrika.tsx komponentida (tag.js + ecommerce:"dataLayer").
 * Bu yerda: SPA pageview, goal (reachGoal) va e-commerce dataLayer yordamchilari.
 *
 * Hammasi window.ym mavjudligini tekshiradi — SSR/agar bloklangan bo'lsa jim o'tadi.
 */

export const YM_ID: number = Number(process.env.NEXT_PUBLIC_YM_ID || 107383008);
export const YM_CURRENCY = 'UZS';

type Params = Record<string, any>;

function callYm(...args: any[]) {
    if (typeof window === 'undefined') return;
    const ym = (window as any).ym;
    if (typeof ym === 'function') {
        try { ym(YM_ID, ...args); } catch { /* jim */ }
    }
}

/** SPA sahifa ko'rinishi (route o'zgarganda). */
export function ymHit(url?: string, options?: Params) {
    const href = url || (typeof window !== 'undefined' ? window.location.href : '');
    if (!href) return;
    callYm('hit', href, { title: typeof document !== 'undefined' ? document.title : undefined, ...options });
}

/** Maqsad (konversiya): savatga qo'shish, buyurtma, to'lov va h.k. */
export function ymGoal(goal: string, params?: Params) {
    callYm('reachGoal', goal, params);
}

// ── E-commerce (dataLayer) ─────────────────────────────────────────────
export interface EcomProduct {
    id: string | number;
    name: string;
    price?: number;
    category?: string;
    brand?: string;
    variant?: string;
    quantity?: number;
}

function pushEcom(action: string, payload: Params) {
    if (typeof window === 'undefined') return;
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ ecommerce: { currencyCode: YM_CURRENCY, [action]: payload } });
}

export function ymViewProduct(product: EcomProduct) {
    pushEcom('detail', { products: [product] });
}
export function ymAddToCart(product: EcomProduct) {
    pushEcom('add', { products: [{ ...product, quantity: product.quantity || 1 }] });
}
export function ymRemoveFromCart(product: EcomProduct) {
    pushEcom('remove', { products: [{ ...product, quantity: product.quantity || 1 }] });
}
export function ymPurchase(products: EcomProduct[], order: { id: string; revenue: number }) {
    pushEcom('purchase', { actionField: { id: order.id, revenue: order.revenue }, products });
}
