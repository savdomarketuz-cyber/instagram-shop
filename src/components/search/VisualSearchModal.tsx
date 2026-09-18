"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Camera, Sparkles, RefreshCw, ChevronRight, Check, Tag } from "lucide-react";
import { Product } from "@/types";
import { getProductSlug } from "@/lib/slugify";
import { VisualAnalysis } from "@/app/api/search/route";

interface VisualSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    imagePreview: string | null;
    isAnalyzing: boolean;
    visualAnalysis: VisualAnalysis | null;
    results: Product[];
    language: "uz" | "ru";
    onChangePhoto: () => void;
    onSelectTag?: (tag: string) => void;
}

const GREEN = "#2D6E3E";

export default function VisualSearchModal({
    isOpen,
    onClose,
    imagePreview,
    isAnalyzing,
    visualAnalysis,
    results,
    language,
    onChangePhoto,
    onSelectTag
}: VisualSearchModalProps) {
    const [activeFilter, setActiveFilter] = useState<string>("all");
    const modalRef = useRef<HTMLDivElement>(null);

    // Escape tugmasi bilan yopish
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    // Rasm o'zgarganda filtrni qayta tiklash
    useEffect(() => {
        setActiveFilter("all");
    }, [imagePreview]);

    if (!isOpen) return null;

    // Filterlangan mahsulotlar
    const filteredResults = results.filter((p) => {
        if (activeFilter === "all") return true;
        const queryLower = activeFilter.toLowerCase();
        const pName = (p.name || "").toLowerCase();
        const pNameUz = (p.name_uz || "").toLowerCase();
        const pNameRu = (p.name_ru || "").toLowerCase();
        const pCat = (p.category_uz || p.category_ru || p.category || "").toLowerCase();
        const pColor = (p.colorName || "").toLowerCase();
        const pModel = (p.model || "").toLowerCase();

        return (
            pName.includes(queryLower) ||
            pNameUz.includes(queryLower) ||
            pNameRu.includes(queryLower) ||
            pCat.includes(queryLower) ||
            pColor.includes(queryLower) ||
            pModel.includes(queryLower)
        );
    });

    const isUz = language === "uz";

    return (
        <div className="fixed inset-0 z-[150] flex flex-col justify-start">
            {/* Orqa qorong'i backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Tepadan pastga tushuvchi Google Lens modal oynasi */}
            <div 
                ref={modalRef}
                className="relative w-full max-h-[92vh] md:max-h-[88vh] bg-[#FBFBFB] text-[#111612] rounded-b-[28px] md:rounded-b-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] z-[160] flex flex-col overflow-hidden border-b border-black/5 animate-in slide-in-from-top-6 duration-300"
            >
                {/* 1. Yuqori sarlavha paneli (Header) */}
                <div className="flex items-center justify-between px-4 md:px-8 py-3.5 bg-white/90 backdrop-blur-md border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        {/* Google Lens uslubidagi kamalak/zumrad gradient nishon */}
                        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2D6E3E] via-[#10B981] to-[#F59E0B] p-[2px] shadow-sm flex items-center justify-center">
                            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                                <Sparkles size={18} className="text-[#2D6E3E]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-base md:text-lg tracking-tight text-gray-900">Velari Lens</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#2D6E3E]/10 text-[#2D6E3E]">
                                    AI Vision
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 hidden sm:block">
                                {isUz ? "Google Lens texnologiyasiga asoslangan vizual qidiruv" : "Визуальный поиск по фото как в Google Lens"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onChangePhoto}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition active:scale-95"
                            title={isUz ? "Boshqa rasm yuklash" : "Загрузить другое фото"}
                        >
                            <Camera size={14} />
                            <span>{isUz ? "O'zgartirish" : "Изменить"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition active:scale-95"
                            aria-label="Yopish"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* 2. Asosiy mazmun (Ikki ustunli / Responsive) */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-8 space-y-6">
                    {/* Yuqori qism: Foydalanuvchi rasmi + AI skaneri + Aniqlangan teglar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* Chap: Google Lens skaneri oynasi */}
                        <div className="md:col-span-4 flex flex-col items-center">
                            <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black/5 border border-gray-200 shadow-inner flex items-center justify-center group">
                                {imagePreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={imagePreview}
                                        alt="Yuklangan rasm"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Camera size={32} />
                                        <span className="text-xs">{isUz ? "Rasm yo'q" : "Нет фото"}</span>
                                    </div>
                                )}

                                {/* Google Lens burchakli nishonlari (Viewfinder reticle) */}
                                <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg pointer-events-none drop-shadow" />
                                <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg pointer-events-none drop-shadow" />
                                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg pointer-events-none drop-shadow" />
                                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg pointer-events-none drop-shadow" />

                                {/* Lazer skaner chizig'i (Skan qilish animatsiyasi) */}
                                {isAnalyzing && (
                                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#10B981] to-transparent shadow-[0_0_15px_#10B981] pointer-events-none animate-lens-scan" />
                                )}
                            </div>

                            {/* Holat yozuvi */}
                            <div className="mt-2.5 text-center">
                                {isAnalyzing ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D6E3E] animate-pulse">
                                        <RefreshCw size={13} className="animate-spin" />
                                        {isUz ? "Rasm AI orqali tahlil qilinmoqda..." : "AI анализирует фото..."}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                                        <Check size={13} className="text-[#2D6E3E]" />
                                        {isUz ? "Vizual tahlil yakunlandi" : "Визуальный анализ завершен"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* O'ng: Aniqlangan mahsulot va Google Lens filtrlari */}
                        <div className="md:col-span-8 space-y-4">
                            {/* Aniqlangan mahsulot sarlavhasi */}
                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                                    <Sparkles size={13} className="text-[#2D6E3E]" />
                                    {isUz ? "AI aniqlagan mahsulot" : "Распознано искусственным интеллектом"}
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                                    {visualAnalysis?.subject || (isAnalyzing ? (isUz ? "Aniqlanmoqda..." : "Распознается...") : (isUz ? "Rasm qidiruvi" : "Поиск по фото"))}
                                </h3>

                                {/* Google Lens chiplari / Tege filtrlari */}
                                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                                    <button
                                        type="button"
                                        onClick={() => setActiveFilter("all")}
                                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all active:scale-95 ${
                                            activeFilter === "all"
                                                ? "bg-[#2D6E3E] text-white shadow-sm"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        {isUz ? "Barchasi" : "Все"} ({results.length})
                                    </button>

                                    {visualAnalysis?.brand && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const b = visualAnalysis.brand!;
                                                setActiveFilter(b);
                                                if (onSelectTag) onSelectTag(b);
                                            }}
                                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all active:scale-95 ${
                                                activeFilter === visualAnalysis.brand
                                                    ? "bg-[#2D6E3E] text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            🏢 {visualAnalysis.brand}
                                        </button>
                                    )}

                                    {visualAnalysis?.color && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const c = visualAnalysis.color!;
                                                setActiveFilter(c);
                                                if (onSelectTag) onSelectTag(c);
                                            }}
                                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all active:scale-95 ${
                                                activeFilter === visualAnalysis.color
                                                    ? "bg-[#2D6E3E] text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            🎨 {visualAnalysis.color}
                                        </button>
                                    )}

                                    {(visualAnalysis?.tags || []).map((tag, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setActiveFilter(tag);
                                                if (onSelectTag) onSelectTag(tag);
                                            }}
                                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all active:scale-95 ${
                                                activeFilter === tag
                                                    ? "bg-[#2D6E3E] text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            🏷️ {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pastki qism: Vizual mos keluvchi mahsulotlar (Google Lens natijalari) */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-base md:text-lg text-gray-900 flex items-center gap-2">
                                <span>{isUz ? "Vizual o'xshash tovarlar" : "Похожие товары по фото"}</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    {filteredResults.length}
                                </span>
                            </h4>
                        </div>

                        {/* Yuklanish holatidagi Skeleton kartalar */}
                        {isAnalyzing && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                {[1, 2, 3, 4].map((n) => (
                                    <div key={n} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm animate-pulse space-y-3">
                                        <div className="aspect-square bg-gray-200 rounded-xl" />
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Natijalar ro'yxati */}
                        {!isAnalyzing && filteredResults.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                {filteredResults.map((product) => {
                                    const slug = getProductSlug(product, language);
                                    const href = `/${language}/products/${slug}`;
                                    const hasDiscount = product.oldPrice && product.oldPrice > product.price;
                                    const discountPercent = hasDiscount
                                        ? Math.round(((product.oldPrice! - product.price) / product.oldPrice!) * 100)
                                        : 0;

                                    return (
                                        <Link
                                            key={product.id}
                                            href={href}
                                            onClick={onClose}
                                            className="group bg-white rounded-2xl p-3 border border-gray-100/80 hover:border-[#2D6E3E]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                        >
                                            <div>
                                                {/* Mahsulot rasmi */}
                                                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2.5">
                                                    {product.image ? (
                                                        <Image
                                                            src={product.image}
                                                            alt={product.name}
                                                            fill
                                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <Tag size={24} />
                                                        </div>
                                                    )}

                                                    {/* Chegirma foizi */}
                                                    {hasDiscount && (
                                                        <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                                                            -{discountPercent}%
                                                        </span>
                                                    )}

                                                    {product.isOriginal && (
                                                        <span className="absolute bottom-1.5 left-1.5 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                                            Original
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Nomi */}
                                                <h5 className="font-semibold text-xs md:text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-[#2D6E3E] transition-colors">
                                                    {isUz ? (product.name_uz || product.name) : (product.name_ru || product.name)}
                                                </h5>
                                            </div>

                                            {/* Narxi va O'tish tugmasi */}
                                            <div className="mt-2.5 pt-2 border-t border-gray-50 flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs md:text-sm font-extrabold text-gray-900">
                                                        {product.price.toLocaleString("ru-RU")} <span className="text-[10px] font-normal text-gray-500">so'm</span>
                                                    </div>
                                                    {hasDiscount && (
                                                        <div className="text-[10px] text-gray-400 line-through">
                                                            {product.oldPrice!.toLocaleString("ru-RU")} so'm
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[#2D6E3E] group-hover:text-white text-gray-600 flex items-center justify-center transition-colors">
                                                    <ChevronRight size={14} />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        {/* Mahsulot topilmagan holat */}
                        {!isAnalyzing && filteredResults.length === 0 && (
                            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
                                    <Camera size={26} />
                                </div>
                                {results.length > 0 && activeFilter !== "all" ? (
                                    <>
                                        <h5 className="font-bold text-gray-800 text-base mb-1">
                                            {isUz ? `"${activeFilter}" bo'yicha tovar topilmadi` : `По фильтру "${activeFilter}" ничего не найдено`}
                                        </h5>
                                        <p className="text-xs text-gray-500 max-w-sm mb-4">
                                            {isUz ? "Ushbu parametr bo'yicha mos keladigan mahsulot yo'q, boshqa tegni tanlang yoki barchasini ko'ring" : "Попробуйте выбрать другой тег или сбросить фильтр"}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setActiveFilter("all")}
                                            className="px-5 py-2.5 rounded-xl bg-[#2D6E3E] text-white text-xs font-bold hover:bg-[#235832] transition active:scale-95 shadow-sm flex items-center gap-2"
                                        >
                                            <span>{isUz ? "Barcha tovarlarni ko'rish" : "Показать все товары"}</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h5 className="font-bold text-gray-800 text-base mb-1">
                                            {isUz ? "Aynan shu rasm bo'yicha mahsulot topilmadi" : "По этому фото точных товаров не найдено"}
                                        </h5>
                                        <p className="text-xs text-gray-500 max-w-sm mb-4">
                                            {isUz 
                                                ? "Tovar rasmini yorug'roq joyda yoki boshqa burchakdan qayta olib yuklab ko'ring"
                                                : "Попробуйте сделать фото товара под другим углом или при лучшем освещении"}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={onChangePhoto}
                                            className="px-5 py-2.5 rounded-xl bg-[#2D6E3E] text-white text-xs font-bold hover:bg-[#235832] transition active:scale-95 shadow-sm flex items-center gap-2"
                                        >
                                            <Camera size={15} />
                                            <span>{isUz ? "Boshqa rasm yuklash" : "Загрузить другое фото"}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pastki tortish chizig'i (iOS modal tutqichi) */}
                <div className="py-2 flex justify-center bg-white border-t border-gray-50">
                    <div className="w-12 h-1 rounded-full bg-gray-300" />
                </div>
            </div>
        </div>
    );
}
