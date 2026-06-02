"use client";

import { useMemo } from "react";
import { Link } from "next-view-transitions";
import Image from "next/image";
import { useStore } from "@/store/store";
import { applyGlobalPromo } from "@/lib/promo-utils";
import { getProductSlug } from "@/lib/slugify";
import type { Product } from "@/types";

/**
 * "Velari'da mashhur" — bazadagi eng ko'p sotilgan mahsulotlarni avtomatik
 * aylanuvchi lenta (marquee) ko'rinishida ko'rsatadi. Real rasm, narx va
 * ishlaydigan mahsulot havolalari bilan (eski statik HTML banner o'rniga).
 */
export default function PopularMarquee({
    products,
    language,
}: {
    products: Product[];
    language: "uz" | "ru";
}) {
    const globalPromo = useStore((s) => s.globalPromo);

    const items = useMemo(() => {
        const inStock = products.filter((p) => {
            const total = p.stockDetails
                ? Object.values(p.stockDetails).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
                : (p.stock || 0);
            return total > 0;
        });
        return [...inStock]
            .sort((a, b) => (b.sales || 0) - (a.sales || 0) || (b.rating || 0) - (a.rating || 0))
            .slice(0, 12);
    }, [products]);

    if (items.length < 4) return null; // yetarli mahsulot bo'lmasa — ko'rsatmaymiz

    const fmtPrice = (n: number) => n.toLocaleString("ru-RU") + (language === "ru" ? " сум" : " so'm");

    // Cheksiz silliq aylanish uchun ro'yxatni ikki marta takrorlaymiz (-50% bilan seamless)
    const loop = [...items, ...items];

    return (
        <div
            style={{
                // container-type:size — ichidagi cqmin/cqw birliklari shu blokka nisbatan hisoblanadi.
                // Balandlik aniq bo'lishi shart (vw bilan responsiv: mobil ~220, desktop ~300).
                containerType: "size",
                position: "relative",
                width: "100%",
                height: "clamp(220px, 56vw, 300px)",
                borderRadius: "clamp(16px,3cqmin,24px)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                gap: "clamp(8px,2.4cqmin,16px)",
                padding: "clamp(12px,4cqmin,28px)",
                background: "linear-gradient(125deg,#160a28 0%,#241047 45%,#0d2e54 100%)",
                fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif",
            } as React.CSSProperties}
        >
            {/* Sarlavha */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flex: "0 0 auto" }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(15px,4.6cqmin,26px)", letterSpacing: "-0.01em" }}>
                    Velari&apos;da{" "}
                    <span style={{ background: "linear-gradient(90deg,#ff80ab,#ffd180)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                        {language === "uz" ? "mashhur" : "популярное"}
                    </span>
                </div>
                <Link
                    href={`/${language}/catalog`}
                    style={{
                        color: "#e0d7ff", fontWeight: 600, fontSize: "clamp(10px,2.8cqmin,14px)", whiteSpace: "nowrap",
                        padding: "clamp(5px,1.6cqmin,9px) clamp(10px,2.8cqmin,16px)", border: "1px solid rgba(255,255,255,.25)",
                        borderRadius: 999, background: "rgba(255,255,255,.08)", textDecoration: "none",
                    }}
                >
                    {language === "uz" ? "Hammasi →" : "Все →"}
                </Link>
            </div>

            {/* Aylanuvchi lenta */}
            <div
                style={{
                    position: "relative",
                    flex: "1 1 auto",
                    minHeight: 0,
                    overflow: "hidden",
                    WebkitMaskImage: "linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)",
                    maskImage: "linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: "clamp(8px,2.4cqmin,16px)",
                        width: "max-content",
                        height: "100%",
                        animation: `velari-marquee ${Math.max(18, items.length * 4)}s linear infinite`,
                    }}
                >
                    {loop.map((raw, idx) => {
                        const p = applyGlobalPromo(raw, globalPromo);
                        const name = (language === "uz" ? p.name_uz : p.name_ru) || p.name;
                        const imgs = (p.images || []).filter((u: string) => u && !u.toLowerCase().endsWith(".mp4"));
                        const img = imgs[0] || p.image || "/placeholder.png";
                        const clone = idx >= items.length; // ikkinchi nusxa — skrinrider uchun yashiramiz
                        const hasDiscount = p.oldPrice && p.oldPrice > p.price;
                        return (
                            <Link
                                key={`${p.id}-${idx}`}
                                href={`/${language}/products/${getProductSlug(p)}`}
                                aria-hidden={clone ? true : undefined}
                                tabIndex={clone ? -1 : undefined}
                                style={{
                                    flex: "0 0 auto",
                                    width: "clamp(140px,40cqw,188px)",
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    borderRadius: "clamp(10px,2.4cqmin,18px)",
                                    overflow: "hidden",
                                    background: "rgba(255,255,255,.07)",
                                    border: "1px solid rgba(255,255,255,.12)",
                                    textDecoration: "none",
                                }}
                            >
                                <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0, width: "100%", background: "#1a1230" }}>
                                    <Image src={img} alt={name} fill sizes="190px" style={{ objectFit: "cover" }} />
                                    {hasDiscount && (
                                        <div style={{ position: "absolute", top: 6, left: 6, background: "#FF3B30", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 8 }}>
                                            -{Math.round(((p.oldPrice! - p.price) / p.oldPrice!) * 100)}%
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: "0 0 auto", padding: "clamp(6px,1.8cqmin,12px)", display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span style={{ color: "#fff", fontWeight: 600, fontSize: "clamp(10px,2.6cqmin,14px)", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {name}
                                    </span>
                                    <span style={{ color: "#ffd180", fontWeight: 700, fontSize: "clamp(11px,2.8cqmin,15px)" }}>
                                        {fmtPrice(p.price)}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
