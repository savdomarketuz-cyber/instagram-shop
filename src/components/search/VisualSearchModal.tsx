"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { X, Camera, Sparkles, RefreshCw, Focus, ArrowRight, CheckCircle2 } from "lucide-react";
import { Product } from "@/types";
import { VisualAnalysis } from "@/app/api/search/route";

interface VisualSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    imagePreview: string | null;
    isAnalyzing: boolean;
    visualAnalysis?: VisualAnalysis | null;
    results?: Product[];
    language: "uz" | "ru";
    onChangePhoto: () => void;
    onSelectTag?: (tag: string) => void;
    onCropSearch?: (croppedBase64: string) => void;
    onViewResults?: () => void;
}

export default function VisualSearchModal({
    isOpen,
    onClose,
    imagePreview,
    isAnalyzing,
    results = [],
    language,
    onChangePhoto,
    onCropSearch,
    onViewResults
}: VisualSearchModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Google Lens Crop Box (foizlarda: 0 - 100)
    const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
        x: 4,
        y: 4,
        width: 92,
        height: 92
    });
    const [aspectRatio, setAspectRatio] = useState<number>(1);
    const [isDraggingBox, setIsDraggingBox] = useState<boolean>(false);

    const dragInfo = useRef<{
        handle: 'move' | 'nw' | 'ne' | 'se' | 'sw' | null;
        startX: number;
        startY: number;
        initialBox: { x: number; y: number; width: number; height: number };
        hasMoved: boolean;
    }>({
        handle: null,
        startX: 0,
        startY: 0,
        initialBox: { x: 4, y: 4, width: 92, height: 92 },
        hasMoved: false
    });

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

    // Rasm o'zgarganda tabiiy proporsiyani aniqlash va qutini tiklash
    useEffect(() => {
        if (!imagePreview) return;
        setActiveFilter("all");
        setCropBox({ x: 4, y: 4, width: 92, height: 92 });

        const img = new window.Image();
        img.onload = () => {
            if (img.naturalWidth && img.naturalHeight) {
                setAspectRatio(img.naturalWidth / img.naturalHeight);
            }
        };
        img.src = imagePreview;
    }, [imagePreview]);

    // Tanlangan qutini kesib (crop) qidiruvga yuborish
    const triggerCropSearch = useCallback((box: { x: number; y: number; width: number; height: number }) => {
        if (!imagePreview || !onCropSearch) return;

        // Agar butun rasmni qamragan bo'lsa (>90%), asl rasmni yuborish
        if (box.width >= 90 && box.height >= 90 && box.x <= 5 && box.y <= 5) {
            onCropSearch(imagePreview);
            return;
        }

        const img = new window.Image();
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const cropX = Math.round((box.x / 100) * img.naturalWidth);
                const cropY = Math.round((box.y / 100) * img.naturalHeight);
                const cropW = Math.round((box.width / 100) * img.naturalWidth);
                const cropH = Math.round((box.height / 100) * img.naturalHeight);

                if (cropW < 10 || cropH < 10) return;

                const maxDim = 1024;
                let targetW = cropW;
                let targetH = cropH;
                if (targetW > maxDim || targetH > maxDim) {
                    if (targetW > targetH) {
                        targetH = Math.round((targetH * maxDim) / targetW);
                        targetW = maxDim;
                    } else {
                        targetW = Math.round((targetW * maxDim) / targetH);
                        targetH = maxDim;
                    }
                }

                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
                const croppedBase64 = canvas.toDataURL("image/jpeg", 0.85);
                onCropSearch(croppedBase64);
            } catch (err) {
                console.error("Visual crop canvas error:", err);
            }
        };
        img.src = imagePreview;
    }, [imagePreview, onCropSearch]);

    // Pointer (Touch / Mouse) surish boshlanishi
    const handlePointerDown = (handle: 'move' | 'nw' | 'ne' | 'se' | 'sw', e: React.PointerEvent) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragInfo.current = {
            handle,
            startX: e.clientX,
            startY: e.clientY,
            initialBox: { ...cropBox },
            hasMoved: false
        };
        setIsDraggingBox(true);
    };

    // Pointer surilishi (Crop box yoki burchaklarni o'zgartirish)
    const handlePointerMove = (e: React.PointerEvent) => {
        const { handle, startX, startY, initialBox } = dragInfo.current;
        if (!handle || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const deltaX = ((e.clientX - startX) / rect.width) * 100;
        const deltaY = ((e.clientY - startY) / rect.height) * 100;

        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
            dragInfo.current.hasMoved = true;
        }

        const minSize = 16; // minimal 16% o'lcham

        if (handle === 'move') {
            const maxX = 100 - initialBox.width;
            const maxY = 100 - initialBox.height;
            const newX = Math.max(0, Math.min(maxX, initialBox.x + deltaX));
            const newY = Math.max(0, Math.min(maxY, initialBox.y + deltaY));
            setCropBox(prev => ({ ...prev, x: newX, y: newY }));
        } else if (handle === 'se') {
            const maxW = 100 - initialBox.x;
            const maxH = 100 - initialBox.y;
            const newW = Math.max(minSize, Math.min(maxW, initialBox.width + deltaX));
            const newH = Math.max(minSize, Math.min(maxH, initialBox.height + deltaY));
            setCropBox(prev => ({ ...prev, width: newW, height: newH }));
        } else if (handle === 'nw') {
            const maxDeltaX = initialBox.width - minSize;
            const maxDeltaY = initialBox.height - minSize;
            const clampedDeltaX = Math.max(-initialBox.x, Math.min(maxDeltaX, deltaX));
            const clampedDeltaY = Math.max(-initialBox.y, Math.min(maxDeltaY, deltaY));
            setCropBox({
                x: initialBox.x + clampedDeltaX,
                y: initialBox.y + clampedDeltaY,
                width: initialBox.width - clampedDeltaX,
                height: initialBox.height - clampedDeltaY
            });
        } else if (handle === 'ne') {
            const maxDeltaY = initialBox.height - minSize;
            const clampedDeltaY = Math.max(-initialBox.y, Math.min(maxDeltaY, deltaY));
            const maxW = 100 - initialBox.x;
            const newW = Math.max(minSize, Math.min(maxW, initialBox.width + deltaX));
            setCropBox({
                x: initialBox.x,
                y: initialBox.y + clampedDeltaY,
                width: newW,
                height: initialBox.height - clampedDeltaY
            });
        } else if (handle === 'sw') {
            const maxDeltaX = initialBox.width - minSize;
            const clampedDeltaX = Math.max(-initialBox.x, Math.min(maxDeltaX, deltaX));
            const maxH = 100 - initialBox.y;
            const newH = Math.max(minSize, Math.min(maxH, initialBox.height + deltaY));
            setCropBox({
                x: initialBox.x + clampedDeltaX,
                y: initialBox.y,
                width: initialBox.width - clampedDeltaX,
                height: newH
            });
        }
    };

    // Qo'l / Sichqoncha ko'tarilganda qidiruvni ishga tushirish
    const handlePointerUp = (e: React.PointerEvent) => {
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
        const hadMovement = dragInfo.current.hasMoved;
        dragInfo.current.handle = null;
        setIsDraggingBox(false);

        if (hadMovement) {
            triggerCropSearch(cropBox);
        }
    };

    // Rasm ustiga bosilganda o'sha ob'yektga avtomatik fokus qilish (Tap to focus)
    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || isDraggingBox || dragInfo.current.hasMoved) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 100;
        const clickY = ((e.clientY - rect.top) / rect.height) * 100;

        // Bosilgan nuqta atrofida 48%x48% quti hosil qilish
        const boxSize = 48;
        const newX = Math.max(0, Math.min(100 - boxSize, clickX - boxSize / 2));
        const newY = Math.max(0, Math.min(100 - boxSize, clickY - boxSize / 2));
        const newBox = { x: newX, y: newY, width: boxSize, height: boxSize };
        setCropBox(newBox);
        triggerCropSearch(newBox);
    };

    // Butun rasmga qaytarish
    const handleResetToFull = () => {
        const fullBox = { x: 4, y: 4, width: 92, height: 92 };
        setCropBox(fullBox);
        triggerCropSearch(fullBox);
    };

    // Natijalarni ko'rish tugmasi bosilganda
    const handleViewResultsClick = () => {
        if (onViewResults) {
            onViewResults();
        } else {
            onClose();
            setTimeout(() => {
                const el = document.getElementById("search-results");
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 120);
        }
    };

    if (!isOpen) return null;

    const isUz = language === "uz";
    const resultsCount = results.length;

    return (
        <div className="fixed inset-0 z-[150] flex flex-col justify-start">
            {/* Orqa qorong'i backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Tepadan pastga tushuvchi ixcham Google Lens skaner oynasi */}
            <div 
                ref={modalRef}
                className="relative w-full max-w-lg mx-auto bg-white text-[#111612] rounded-b-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] z-[160] flex flex-col overflow-hidden border-b border-black/5 animate-in slide-in-from-top-6 duration-300"
            >
                {/* 1. Sarlavha paneli */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2D6E3E] via-[#10B981] to-[#F59E0B] p-[2px] shadow-sm flex items-center justify-center">
                            <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
                                <Sparkles size={16} className="text-[#2D6E3E]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-base tracking-tight text-gray-900">Velari Lens</span>
                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#2D6E3E]/10 text-[#2D6E3E]">
                                    AI Vision
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                                {isUz ? "Ob'yektni ramkaga oling" : "Выделите объект рамкой"}
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
                            <Camera size={13} />
                            <span>{isUz ? "O'zgartirish" : "Изменить"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition active:scale-95"
                            aria-label="Yopish"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                {/* 2. Rasm va Google Lens Ob'yekt tanlash ramkasi */}
                <div className="p-4 sm:p-6 flex flex-col items-center gap-4 bg-[#FBFBFB]">
                    <div 
                        ref={containerRef}
                        onClick={handleContainerClick}
                        className="relative inline-flex max-w-full rounded-2xl overflow-hidden bg-black/5 border border-gray-200 shadow-md select-none cursor-crosshair touch-none mx-auto"
                    >
                        {imagePreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={imagePreview}
                                alt="Yuklangan rasm"
                                className="block max-h-[300px] sm:max-h-[340px] max-w-full w-auto h-auto pointer-events-none select-none"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400 gap-2 p-12">
                                <Camera size={32} />
                                <span className="text-xs">{isUz ? "Rasm yo'q" : "Нет фото"}</span>
                            </div>
                        )}

                        {/* Google Lens interaktiv ob'yekt tanlash ramkasi (Crop Box) */}
                        {imagePreview && (
                            <div
                                style={{
                                    left: `${cropBox.x}%`,
                                    top: `${cropBox.y}%`,
                                    width: `${cropBox.width}%`,
                                    height: `${cropBox.height}%`,
                                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)"
                                }}
                                className="absolute border border-white/90 rounded-xl transition-[box-shadow] duration-75 cursor-move"
                                onPointerDown={(e) => handlePointerDown('move', e)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                            >
                                {/* Lazer skaner chizig'i (faqat tanlangan ramka ichida skan qiladi) */}
                                {isAnalyzing && (
                                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#10B981] to-transparent shadow-[0_0_15px_#10B981] pointer-events-none animate-lens-scan" />
                                )}

                                {/* 4 ta Google Lens burchakli nishoni (Tegib surish nuqtalari) */}
                                <div
                                    onPointerDown={(e) => handlePointerDown('nw', e)}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-20 group"
                                    title="Burchakni surish"
                                >
                                    <div className="w-4 h-4 border-t-[3px] border-l-[3px] border-white rounded-tl-[4px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-transform group-active:scale-125" />
                                </div>

                                <div
                                    onPointerDown={(e) => handlePointerDown('ne', e)}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-20 group"
                                    title="Burchakni surish"
                                >
                                    <div className="w-4 h-4 border-t-[3px] border-r-[3px] border-white rounded-tr-[4px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-transform group-active:scale-125" />
                                </div>

                                <div
                                    onPointerDown={(e) => handlePointerDown('sw', e)}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    className="absolute -bottom-3 -left-3 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-20 group"
                                    title="Burchakni surish"
                                >
                                    <div className="w-4 h-4 border-b-[3px] border-l-[3px] border-white rounded-bl-[4px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-transform group-active:scale-125" />
                                </div>

                                <div
                                    onPointerDown={(e) => handlePointerDown('se', e)}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    className="absolute -bottom-3 -right-3 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-20 group"
                                    title="Burchakni surish"
                                >
                                    <div className="w-4 h-4 border-b-[3px] border-r-[3px] border-white rounded-br-[4px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-transform group-active:scale-125" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Holat yozuvi va boshqaruv tugmalari */}
                    <div className="flex flex-col items-center gap-2 w-full text-center">
                        <div className="flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={handleResetToFull}
                                className="text-[11px] font-semibold text-gray-700 hover:text-[#2D6E3E] bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1 rounded-full transition active:scale-95 flex items-center gap-1.5 shadow-sm"
                                title={isUz ? "Butun rasmni qidirish" : "Искать по всему фото"}
                            >
                                <Focus size={12} />
                                <span>{isUz ? "Butun rasm" : "Всё фото"}</span>
                            </button>
                            <span className="text-[11px] text-gray-400">
                                {isUz ? "Ob'yektni bosing yoki ramkani suring" : "Нажмите или переместите рамку"}
                            </span>
                        </div>

                        {/* AI Holati */}
                        {isAnalyzing ? (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2D6E3E]/10 text-[#2D6E3E] text-xs font-semibold animate-pulse">
                                <RefreshCw size={13} className="animate-spin" />
                                <span>{isUz ? "O'xshash tovarlar qidirilmoqda..." : "Поиск похожих товаров..."}</span>
                            </div>
                        ) : resultsCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D6E3E]">
                                <CheckCircle2 size={14} className="text-[#2D6E3E]" />
                                <span>
                                    {isUz 
                                        ? `${resultsCount} ta mos mahsulot topildi` 
                                        : `Найдено ${resultsCount} товаров`}
                                </span>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-500 font-medium">
                                {isUz ? "Bu sohada mos mahsulot topilmadi" : "В этой области товары не найдены"}
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. Pastki harakat paneli: Asosiy sahifadagi natijalarni ko'rish */}
                <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleViewResultsClick}
                        disabled={isAnalyzing}
                        className={`w-full py-3 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                            resultsCount > 0
                                ? "bg-[#2D6E3E] hover:bg-[#235832] text-white shadow-[#2D6E3E]/20 cursor-pointer"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                    >
                        {isAnalyzing ? (
                            <>
                                <RefreshCw size={15} className="animate-spin" />
                                <span>{isUz ? "Qidirilmoqda..." : "Поиск..."}</span>
                            </>
                        ) : resultsCount > 0 ? (
                            <>
                                <span>
                                    {isUz
                                        ? `Natijalarni ko'rish (${resultsCount} ta tovar)`
                                        : `Посмотреть результаты (${resultsCount})`}
                                </span>
                                <ArrowRight size={16} />
                            </>
                        ) : (
                            <span>{isUz ? "Oynani yopish" : "Закрыть"}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
