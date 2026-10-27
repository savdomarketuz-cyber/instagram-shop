"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingCart, Check, ExternalLink, Sparkles, ShieldCheck, Truck } from "lucide-react";
import { Product } from "@/types";
import { getProductSlug } from "@/lib/slugify";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";

interface ProductDetailOverlayProps {
    product: Product | null;
    lang: "uz" | "ru";
    onClose: () => void;
}

export default function ProductDetailOverlay({ product, lang, onClose }: ProductDetailOverlayProps) {
    const [isAdded, setIsAdded] = useState(false);
    const addToCart = useStore((state) => state.addToCart);
    const showToast = useStore((state) => state.showToast);
    const t = translations[lang];

    if (!product) return null;

    const name = lang === "ru" ? (product.name_ru || product.name) : (product.name_uz || product.name);
    const description = lang === "ru" ? (product.description_ru || product.description) : (product.description_uz || product.description);
    const category = lang === "ru" ? (product.category_ru || product.category) : (product.category_uz || product.category);
    const slug = getProductSlug(product, lang);

    const handleAddToCart = () => {
        addToCart(product);
        setIsAdded(true);
        showToast(
            lang === "ru" ? "Товар добавлен в корзину!" : "Mahsulot savatga qo'shildi!",
            "success"
        );
        setTimeout(() => setIsAdded(false), 2200);
    };

    return (
        <div className="fixed bottom-4 inset-x-3 sm:bottom-auto sm:top-20 sm:right-6 sm:left-auto sm:w-[360px] z-40 max-w-[calc(100vw-1.5rem)] animate-in fade-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="relative max-h-[82vh] overflow-y-auto rounded-3xl border border-black/8 bg-white/95 p-5 sm:p-6 text-[#1d1d1f] shadow-[0_24px_60px_rgba(0,0,0,0.2)] backdrop-blur-2xl ring-1 ring-black/5">
                {/* Orqa nozik nur */}
                <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

                {/* Yopish tugmasi */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-[#6e6e73] transition-all hover:bg-black/10 hover:text-[#1d1d1f] active:scale-95"
                    title={lang === "ru" ? "Закрыть" : "Yopish"}
                >
                    <X size={18} />
                </button>

                {/* Mahsulot rasmi */}
                <div className="relative mb-5 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-100/70 border border-black/5 p-4">
                    {product.image ? (
                        <div className="relative h-full w-full">
                            <Image
                                src={product.image}
                                alt={name}
                                fill
                                sizes="320px"
                                className="object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.12)] transition-transform duration-500 hover:scale-105"
                            />
                        </div>
                    ) : (
                        <Sparkles size={48} className="text-neutral-400" />
                    )}

                    <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm border border-emerald-200/60 backdrop-blur-md">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {t.showroom.inStock}
                    </span>
                </div>

                {/* Kategoriya va Nomi */}
                <div className="mb-2">
                    <span className="text-[10px] font-bold tracking-wider text-[#86868b] uppercase">
                        {category}
                    </span>
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#1d1d1f]">
                        {name}
                    </h3>
                </div>

                {/* Tavsif (qisqa) */}
                {description && (
                    <p className="mb-3 line-clamp-2 text-xs text-[#515154] leading-relaxed">
                        {description}
                    </p>
                )}

                {/* Narx */}
                <div className="mb-4 flex items-baseline gap-2.5">
                    <span className="text-xl font-extrabold text-[#1d1d1f]">
                        {product.price.toLocaleString("uz-UZ")} <span className="text-xs font-semibold text-[#86868b]">so&apos;m</span>
                    </span>
                    {product.oldPrice && product.oldPrice > product.price && (
                        <span className="text-xs text-[#86868b] line-through">
                            {product.oldPrice.toLocaleString("uz-UZ")} so&apos;m
                        </span>
                    )}
                </div>

                {/* Imtiyozlar mini nishonlari */}
                <div className="mb-5 grid grid-cols-2 gap-2 border-y border-neutral-200/80 py-3 text-[11px] text-[#6e6e73]">
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                        <span>100% Original</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Truck size={14} className="text-[#0071e3] shrink-0" />
                        <span>Tez yetkazib berish</span>
                    </div>
                </div>

                {/* Tugmalar */}
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={handleAddToCart}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-98 ${
                            isAdded
                                ? "bg-emerald-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
                                : "bg-[#1d1d1f] text-white hover:bg-black shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                        }`}
                    >
                        {isAdded ? (
                            <>
                                <Check size={16} />
                                <span>{lang === "ru" ? "Добавлено!" : "Savatda!"}</span>
                            </>
                        ) : (
                            <>
                                <ShoppingCart size={16} />
                                <span>{t.common.addToCart}</span>
                            </>
                        )}
                    </button>

                    <Link
                        href={`/${lang}/products/${slug}`}
                        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white/70 text-xs font-semibold text-[#1d1d1f] transition-all hover:bg-white hover:border-black/20 hover:shadow-sm active:scale-98"
                    >
                        <span>{t.showroom.viewDetails}</span>
                        <ExternalLink size={13} className="text-[#86868b]" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
