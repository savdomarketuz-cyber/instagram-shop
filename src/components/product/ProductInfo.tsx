"use client";

import Link from "next/link";
import { getProductSlug } from "@/lib/slugify";
import { Star, Check, Truck, Clock, RefreshCw, FileText } from "lucide-react";

const GREEN = "#2D6E3E";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

interface ProductInfoProps {
    product: any;
    language: "uz" | "ru";
    t: any;
    groupProducts: any[];
    totalStock: number;
    getDeliveryDateText: () => string;
    onDescriptionOpen: () => void;
    personalOffer?: { percent: number; reason_uz?: string; reason_ru?: string; expires_at?: string | null } | null;
}

export const ProductInfo = ({
    product, language, t, groupProducts, totalStock, getDeliveryDateText, onDescriptionOpen, personalOffer
}: ProductInfoProps) => {
    const name = (language === "uz" ? product.name_uz : product.name_ru) || product.name;
    const fmtPrice = (n: number) => n.toLocaleString("ru-RU") + (language === "ru" ? " сум" : " so'm");
    // Shaxsiy smart-chegirma (desktop bilan bir xil ko'rinish): yakuniy narx + chizilgan asl narx
    const hasPersonal = !!personalOffer && personalOffer.percent > 0;
    const personalPrice = hasPersonal ? Math.round(product.price * (1 - personalOffer!.percent / 100)) : product.price;

    return (
        <div style={{ padding: "20px 20px 120px", background: "#FAFAF6", position: "relative", zIndex: 20 }}>

            {/* Original badge */}
            {product.isOriginal && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EAF3EC", borderRadius: 10, padding: "6px 12px", marginBottom: 12 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={9} color="#fff" strokeWidth={4} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: GREEN, letterSpacing: 0.4, textTransform: "uppercase" }}>
                        {language === "uz" ? "Original sifat" : "Оригинальное качество"}
                    </span>
                </div>
            )}

            {/* Name */}
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, color: "#0F1410", lineHeight: 1.25, margin: "0 0 10px" }}>
                {name}
            </h1>

            {/* Rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 2 }}>
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} size={13} fill={(product.rating || 0) > i ? "#F6B100" : "none"} color={(product.rating || 0) > i ? "#F6B100" : "#D0D5CF"} />
                    ))}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9AA29C" }}>
                    {(product.reviewCount || 0) > 0
                        ? `${(product.rating || 0).toFixed(1)} (${product.reviewCount} ${language === "uz" ? "sharh" : "отзыв"})`
                        : (language === "uz" ? "Yangi mahsulot" : "Новый товар")}
                </span>
            </div>

            {/* Price card */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "16px 18px", marginBottom: 14, boxShadow: "0 2px 8px rgba(15,20,16,0.04)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA29C", letterSpacing: 0.4, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{t.common.price}</span>
                {hasPersonal ? (
                    // Shaxsiy chegirma: faqat 2 narx — yakuniy shaxsiy narx + chizilgan asl narx
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, background: "#4F46E5", color: "#fff", borderRadius: 7, padding: "2px 8px", letterSpacing: 0.3 }}>
                                -{personalOffer!.percent}%
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#4F46E5", letterSpacing: 0.3, textTransform: "uppercase" }}>
                                {language === "uz" ? "Siz uchun shaxsiy narx" : "Персональная цена"}
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, color: "#4F46E5" }}>
                                {fmtPrice(personalPrice)}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#C0C5BF", textDecoration: "line-through" }}>
                                {fmtPrice((product.oldPrice && product.oldPrice > product.price ? product.oldPrice : product.price) || 0)}
                            </span>
                        </div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "#9AA29C", margin: "4px 0 0" }}>
                            {language === "uz" ? "Chegirma buyurtmada avtomatik qo'llanadi" : "Скидка применится автоматически при оформлении"}
                        </p>
                    </>
                ) : (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, color: product.oldPrice && product.oldPrice > product.price ? "#FF3B30" : "#0F1410" }}>
                            {fmtPrice(product.price || 0)}
                        </span>
                        {product.oldPrice && product.oldPrice > product.price && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "#C0C5BF", textDecoration: "line-through" }}>
                                    {fmtPrice(product.oldPrice)}
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 800, background: "#FF3B30", color: "#fff", borderRadius: 7, padding: "2px 7px" }}>
                                    -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Variants / Group */}
            {groupProducts.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9AA29C", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 10 }}>
                        {language === "uz" ? "Rang" : "Цвет"}: <span style={{ color: "#0F1410", fontWeight: 800 }}>{product.colorName || "—"}</span>
                    </p>
                    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }} className="no-scrollbar">
                        {groupProducts.map(v => (
                            <Link replace key={v.id} href={`/products/${getProductSlug(v, language)}`}
                                style={{ flexShrink: 0, width: 56, height: 72, borderRadius: 16, overflow: "hidden", border: v.id === product.id ? `2.5px solid ${GREEN}` : "2px solid rgba(15,20,16,0.08)", textDecoration: "none", display: "block", transform: v.id === product.id ? "scale(1.06)" : undefined, boxShadow: v.id === product.id ? "0 4px 12px rgba(45,110,62,0.18)" : "none" }}
                            >
                                <img src={v.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={v.colorName} />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Stock */}
            {totalStock > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EAF3EC", borderRadius: 16, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={16} color="#fff" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1F5A30" }}>
                        {language === "uz" ? "Omborda mavjud" : "В наличии"}: <strong>{Number(totalStock)} {language === "uz" ? "ta" : "шт"}</strong>
                    </span>
                </div>
            )}

            {/* Delivery card */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 10, boxShadow: "0 2px 8px rgba(15,20,16,0.04)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Truck size={20} color="#fff" strokeWidth={2} />
                </div>
                <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9AA29C", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 2 }}>{t.common.delivery}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#0F1410", letterSpacing: -0.3 }}>{getDeliveryDateText()}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: GREEN }}>· {language === "uz" ? "Tezkor" : "Быстро"}</span>
                    </div>
                </div>
            </div>

            {/* Return card */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 16, boxShadow: "0 2px 8px rgba(15,20,16,0.04)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: "#F0F0EC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <RefreshCw size={20} color="#5A625C" strokeWidth={2} />
                </div>
                <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9AA29C", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 2 }}>
                        {language === "uz" ? "Qaytarish" : "Возврат"}
                    </p>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#0F1410", letterSpacing: -0.3 }}>
                        {language === "uz" ? "14 kun ichida" : "В течение 14 дней"}
                    </span>
                </div>
            </div>

            {/* Description button */}
            <button
                onClick={onDescriptionOpen}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: "#fff", border: `1.5px solid rgba(45,110,62,0.15)`, borderRadius: 18, fontSize: 14, fontWeight: 700, color: GREEN, cursor: "pointer", boxShadow: "0 2px 8px rgba(15,20,16,0.04)", WebkitTapHighlightColor: "transparent" }}
            >
                <FileText size={16} color={GREEN} />
                {language === "uz" ? "To'liq tavsifni ko'rish" : "Полное описание"}
            </button>
        </div>
    );
};
