"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { PUBLIC_PRODUCT_COLUMNS } from "@/lib/public-product";
import { mapProduct } from "@/lib/mappers";
import { getProductSlug } from "@/lib/slugify";
import { Product } from "@/types";
import { useStore } from "@/store/store";
import { applyGlobalPromo } from "@/lib/promo-utils";

const STORAGE_KEY = "velari_recently_viewed";
const STORAGE_ITEMS_KEY = "velari_recently_viewed_items";
const MAX_ITEMS = 10;

export function trackProductView(productOrId: string | Product) {
    if (!productOrId) return;
    try {
        const isObj = typeof productOrId === "object";
        const productId = isObj ? productOrId.id : productOrId;
        if (!productId) return;

        // 1. Maintain IDs list (for analytics & AI recommendations)
        const rawIds = localStorage.getItem(STORAGE_KEY);
        const ids: string[] = rawIds ? JSON.parse(rawIds) : [];
        const filteredIds = ids.filter(id => id !== productId);
        filteredIds.unshift(productId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredIds.slice(0, MAX_ITEMS)));

        // 2. Maintain full product objects (for 0ms instant display without layout shift)
        if (isObj) {
            const rawItems = localStorage.getItem(STORAGE_ITEMS_KEY);
            const items: any[] = rawItems ? JSON.parse(rawItems) : [];
            const filteredItems = items.filter(item => item && item.id !== productId);
            filteredItems.unshift({
                id: productOrId.id,
                name: productOrId.name,
                name_uz: productOrId.name_uz,
                name_ru: productOrId.name_ru,
                price: productOrId.price,
                oldPrice: productOrId.oldPrice,
                image: productOrId.image,
                images: productOrId.images,
                image_metadata: productOrId.image_metadata
            });
            localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(filteredItems.slice(0, MAX_ITEMS)));
        }
    } catch {
        // localStorage unavailable
    }
}

export function getRecentlyViewedIds(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function getRecentlyViewedProducts(): Product[] {
    try {
        const raw = localStorage.getItem(STORAGE_ITEMS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(item => item && typeof item === "object" && item.id);
    } catch {
        return [];
    }
}

const GREEN = "#2D6E3E";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

interface RecentlyViewedProps {
    language: "uz" | "ru";
    currentProductId?: string;
}

export default function RecentlyViewed({ language, currentProductId }: RecentlyViewedProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const globalPromo = useStore(s => s.globalPromo);
    const personalOffers = useStore(s => s.personalOffers);

    useEffect(() => {
        // 1. Instant local load (0ms — prevents layout shift)
        const cached = getRecentlyViewedProducts().filter(p => p.id !== currentProductId);
        if (cached.length > 0) {
            setProducts(cached);
            return;
        }

        // 2. Fallback for legacy ID-only storage
        const ids = getRecentlyViewedIds().filter(id => id !== currentProductId);
        if (ids.length === 0) return;

        supabase
            .from("products")
            .select(PUBLIC_PRODUCT_COLUMNS)
            .in("id", ids.slice(0, 8))
            .eq("is_deleted", false)
            .then(({ data }) => {
                if (!data) return;
                const mapped = ids
                    .map(id => data.find(d => d.id === id))
                    .filter(Boolean)
                    .map(mapProduct);
                setProducts(mapped);
            });
    }, [currentProductId]);

    if (products.length === 0) return null;

    const fmtPrice = (n: number) =>
        n.toLocaleString("ru-RU") + (language === "ru" ? " сум" : " so'm");

    return (
        <div className="w-full mt-6 mb-6 overflow-hidden select-none">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 8px 12px" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: "#0F1410", margin: 0 }}>
                    {language === "uz" ? "Yaqinda ko'rdingiz" : "Недавно смотрели"}
                </h2>
            </div>

            {/* Horizontal scroll (Works on Mobile and Desktop) */}
            <div
                style={{ display: "flex", gap: 12, overflowX: "auto", padding: "2px 8px 8px", scrollbarWidth: "none" }}
                className="no-scrollbar touch-pan-x"
            >
                {products.map((product) => {
                    const name = (language === "uz" ? product.name_uz : product.name_ru) || product.name;
                    const mainImg = product.images?.[0] || product.image || "/placeholder.png";
                    const slug = getProductSlug(product, language);

                    const promoProduct = applyGlobalPromo(product, globalPromo);
                    const personalPct = personalOffers[product.id] || 0;
                    const hasPersonal = personalPct > 0;
                    const displayPrice = hasPersonal
                        ? Math.round(promoProduct.price * (1 - personalPct / 100))
                        : promoProduct.price;
                    const struckPrice = hasPersonal
                        ? (promoProduct.oldPrice && promoProduct.oldPrice > promoProduct.price ? promoProduct.oldPrice : promoProduct.price)
                        : (promoProduct.oldPrice && promoProduct.oldPrice > promoProduct.price ? promoProduct.oldPrice : null);

                    return (
                        <Link
                            key={product.id}
                            href={`/${language}/products/${slug}`}
                            className="ios-tap-feedback active:scale-[0.97] transition-transform duration-150 shrink-0"
                            style={{
                                width: 140,
                                background: "#fff",
                                borderRadius: 20,
                                overflow: "hidden",
                                textDecoration: "none",
                                border: "1px solid rgba(15,20,16,0.06)",
                                boxShadow: "0 2px 10px rgba(15,20,16,0.04)",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            <div style={{ position: "relative", aspectRatio: "3/4", background: "#F5F5F0" }}>
                                <Image
                                    src={product.image_metadata?.[mainImg]?.lowResUrl || mainImg}
                                    alt={name}
                                    fill
                                    sizes="140px"
                                    style={{ objectFit: "cover" }}
                                    placeholder={product.image_metadata?.[mainImg]?.blurDataURL ? "blur" : "empty"}
                                    blurDataURL={product.image_metadata?.[mainImg]?.blurDataURL}
                                />
                            </div>
                            <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#0F1410",
                                    letterSpacing: -0.1,
                                    lineHeight: 1.3,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical" as const,
                                    overflow: "hidden",
                                    marginBottom: 6,
                                }}>
                                    {name}
                                </div>
                                <div>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
                                        <span style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: (hasPersonal || (promoProduct.price < product.price)) ? "#2D6E3E" : "#0F1410",
                                            letterSpacing: -0.2
                                        }}>
                                            {fmtPrice(displayPrice)}
                                        </span>
                                        {struckPrice && (
                                            <span style={{ fontSize: 10, color: "#9AA29C", textDecoration: "line-through" }}>
                                                {fmtPrice(struckPrice)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
