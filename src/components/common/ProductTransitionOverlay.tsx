"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, Heart, Search, Check, Star, Maximize2 } from "lucide-react";
import { productTransitionManager, type TransitionProductPayload } from "@/lib/product-transition";

// Snappy firm timing (Total ~0.76s sequence):
// 1) 0ms -> 360ms: Image expands firmly into 1:1 destination (Desktop: col-7 hero, Mobile: left 85vw)
// 2) 360ms -> 640ms: Desktop (thumbnails + right info panel) / Mobile (info + top controls) slide firmly into place
// 3) 660ms -> 760ms: Clean 100ms dissolve into the pre-mounted real page
const IMAGE_EXPAND_MS = 360;
const INFO_SLIDE_MS = 280;
const FADE_OUT_START_MS = 660;
const FADE_OUT_DURATION = 100;
const CLEANUP_MS = 780;
const FIRM_EASE = "cubic-bezier(0.2, 0.9, 0.25, 1)";

export default function ProductTransitionOverlay({ lang = "uz" }: { lang?: string }) {
    const [payload, setPayload] = useState<TransitionProductPayload | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    // Responsive screen width state (updates on resize)
    const [windowWidth, setWindowWidth] = useState<number>(() =>
        typeof window !== "undefined" ? window.innerWidth : 390
    );

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const timerInfoRef = useRef<NodeJS.Timeout | null>(null);
    const timerFadeRef = useRef<NodeJS.Timeout | null>(null);
    const timerDoneRef = useRef<NodeJS.Timeout | null>(null);
    const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

    const clearAllTimers = () => {
        if (timerInfoRef.current) clearTimeout(timerInfoRef.current);
        if (timerFadeRef.current) clearTimeout(timerFadeRef.current);
        if (timerDoneRef.current) clearTimeout(timerDoneRef.current);
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        timerInfoRef.current = null;
        timerFadeRef.current = null;
        timerDoneRef.current = null;
        safetyTimerRef.current = null;
    };

    const resetState = () => {
        clearAllTimers();
        setPayload(null);
        setIsExpanded(false);
        setShowInfo(false);
        setIsFadingOut(false);
        productTransitionManager.clear();
    };

    // Subscribe to product transition trigger
    useEffect(() => {
        const unsubscribe = productTransitionManager.subscribe((newPayload) => {
            if (newPayload) {
                clearAllTimers();
                setPayload(newPayload);
                setIsExpanded(false);
                setShowInfo(false);
                setIsFadingOut(false);

                // Stage 1: Card image expands firmly into destination
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsExpanded(true);
                    });
                });

                // Stage 2: After image expansion completes (360ms), slide in remaining panels
                timerInfoRef.current = setTimeout(() => {
                    setShowInfo(true);
                }, IMAGE_EXPAND_MS);

                // Stage 3: At 660ms, gentle dissolve into the pre-mounted real page
                timerFadeRef.current = setTimeout(() => {
                    setIsFadingOut(true);
                }, FADE_OUT_START_MS);

                // Stage 4: Overlay cleanup at 780ms
                timerDoneRef.current = setTimeout(() => {
                    resetState();
                }, CLEANUP_MS);

                // Safety timeout: dismiss after 3s if unexpected error occurs
                safetyTimerRef.current = setTimeout(() => {
                    resetState();
                }, 3000);
            } else {
                resetState();
            }
        });

        const handlePopstate = () => {
            resetState();
        };
        window.addEventListener("popstate", handlePopstate);

        return () => {
            unsubscribe();
            window.removeEventListener("popstate", handlePopstate);
            clearAllTimers();
        };
    }, []);

    if (!payload) return null;

    const isMobile = windowWidth < 768;

    // --- 1:1 PIXEL MATCHING GEOMETRY ---

    // 1. Mobile Geometry (< 768px): Matches ProductMedia (px-5, min-w-[85vw]) + ProductInfo
    const mobileImgWidth = windowWidth * 0.85; // exactly 85vw
    const mobileImgHeight = mobileImgWidth * (4 / 3); // aspect-[3/4]
    const mobileImgTop = 8; // pt-2
    const mobileImgLeft = 20; // px-5
    const mobileImgRadius = 28; // rounded-[28px]
    const mobileInfoTop = mobileImgTop + mobileImgHeight + 24; // pb-6 ends, ProductInfo begins

    // 2. Desktop Geometry (>= 768px): Matches ProductClient (max-w-[1600px] px-10 py-12, 12-col grid)
    const containerWidth = Math.min(1600, windowWidth);
    const containerLeft = (windowWidth - containerWidth) / 2;
    const contentLeft = containerLeft + 40; // px-10 left margin
    const availableWidth = containerWidth - 80;

    const isLg = windowWidth >= 1024;
    const col7Width = isLg ? (availableWidth - 64) * (7 / 12) : availableWidth;
    const col5Width = isLg ? (availableWidth - 64) * (5 / 12) : availableWidth;

    // Desktop Left Gallery:
    const desktopThumbLeft = contentLeft;
    const desktopThumbWidth = 160; // w-40 (160px)
    const desktopHeroLeft = contentLeft + 200; // after 160px thumbnails + 40px gap
    const desktopHeroWidth = Math.min(620, Math.max(380, col7Width - 200));
    const desktopHeroHeight = Math.min(760, desktopHeroWidth * (4 / 3));
    const desktopHeroTop = 220; // header (~112px) + py-12 (~48px) + breadcrumbs (~60px)
    const desktopHeroRadius = 40; // rounded-[40px]

    // Desktop Right Info Panel:
    const desktopInfoTop = isLg ? desktopHeroTop : (desktopHeroTop + desktopHeroHeight + 24);
    const desktopInfoLeft = isLg ? (contentLeft + col7Width + 64) : contentLeft;
    const desktopInfoWidth = Math.min(500, col5Width);

    // Active destination coordinates
    const targetTop = isMobile ? mobileImgTop : desktopHeroTop;
    const targetLeft = isMobile ? mobileImgLeft : desktopHeroLeft;
    const targetWidth = isMobile ? mobileImgWidth : desktopHeroWidth;
    const targetHeight = isMobile ? mobileImgHeight : desktopHeroHeight;
    const targetBorderRadius = isMobile ? mobileImgRadius : desktopHeroRadius;

    const boxStyle: React.CSSProperties = {
        position: "fixed",
        top: isExpanded ? targetTop : payload.rect.top,
        left: isExpanded ? targetLeft : payload.rect.left,
        width: isExpanded ? targetWidth : payload.rect.width,
        height: isExpanded ? targetHeight : payload.rect.height,
        borderRadius: isExpanded ? targetBorderRadius : 24,
        background: "#ffffff",
        overflow: "hidden",
        border: isExpanded ? "1px solid #F3F4F6" : "1px solid rgba(15,20,16,0.06)",
        boxShadow: isExpanded
            ? (isMobile ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.04)")
            : "0 4px 20px rgba(15,20,16,0.06)",
        transition: `top ${IMAGE_EXPAND_MS}ms ${FIRM_EASE}, left ${IMAGE_EXPAND_MS}ms ${FIRM_EASE}, width ${IMAGE_EXPAND_MS}ms ${FIRM_EASE}, height ${IMAGE_EXPAND_MS}ms ${FIRM_EASE}, border-radius ${IMAGE_EXPAND_MS}ms ${FIRM_EASE}`,
        zIndex: 260,
        willChange: "top, left, width, height, border-radius",
    };

    const name = (lang === "ru" ? payload.name_ru : payload.name_uz) || payload.name;
    const fmtPrice = (n: number) => {
        return n.toLocaleString("ru-RU") + (lang === "ru" ? " сум" : " so'm");
    };

    const isVideo = payload.image?.toLowerCase().endsWith(".mp4");
    // 0% BLUR: Exact crisp image decoded from the card bitmap
    const activeImageSrc = payload.cardImgSrc || payload.image;

    return (
        <div
            className={`fixed inset-0 z-[250] ${isFadingOut ? "pointer-events-none" : "pointer-events-auto"}`}
            style={{
                opacity: isFadingOut ? 0 : 1,
                transition: `opacity ${FADE_OUT_DURATION}ms ease-out`,
            }}
            aria-hidden="true"
        >
            {/* Background: Mobile has #fff behind media and #FAFAF6 below it. Desktop has #fff. */}
            {isMobile ? (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        opacity: isExpanded ? 1 : 0,
                        transition: `opacity ${IMAGE_EXPAND_MS - 40}ms ease-out`,
                    }}
                >
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: mobileInfoTop, background: "#ffffff" }} />
                    <div style={{ position: "absolute", top: mobileInfoTop, left: 0, right: 0, bottom: 0, background: "#FAFAF6" }} />
                </div>
            ) : (
                <div
                    className="absolute inset-0 bg-white pointer-events-none"
                    style={{
                        opacity: isExpanded ? 1 : 0,
                        transition: `opacity ${IMAGE_EXPAND_MS - 40}ms ease-out`,
                    }}
                />
            )}

            {/* ========================================================================= */}
            {/* MOBILE ONLY OVERLAYS (< 768px)                                            */}
            {/* ========================================================================= */}
            {isMobile && (
                <>
                    {/* Floating Top Controls */}
                    <div
                        style={{
                            position: "fixed",
                            top: 16,
                            left: 16,
                            right: 16,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            zIndex: 262,
                            opacity: showInfo ? 1 : 0,
                            transition: `opacity ${INFO_SLIDE_MS}ms ease-out`,
                            pointerEvents: "none",
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div className="glass-icon-button w-11 h-11 text-[#111612]">
                                <ChevronLeft size={20} strokeWidth={2} />
                            </div>
                            <div className="glass-icon-button w-11 h-11 text-[#111612]">
                                <Search size={19} strokeWidth={2} />
                            </div>
                        </div>
                        <div className="glass-icon-button w-11 h-11 text-[#111612]">
                            <Heart size={20} strokeWidth={2} />
                        </div>
                    </div>

                    {/* Mobile Product Info: 1:1 match with ProductInfo.tsx */}
                    <div
                        style={{
                            position: "fixed",
                            top: mobileInfoTop,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "#FAFAF6",
                            padding: "20px 20px 120px",
                            opacity: showInfo ? 1 : 0,
                            transform: showInfo ? "translateY(0)" : "translateY(-16px)",
                            transition: `opacity ${INFO_SLIDE_MS}ms ease-out, transform ${INFO_SLIDE_MS}ms ${FIRM_EASE}`,
                            zIndex: 261,
                            pointerEvents: "none",
                            overflow: "hidden",
                        }}
                    >
                        {/* Original badge */}
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EAF3EC", borderRadius: 10, padding: "6px 12px", marginBottom: 12 }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#2D6E3E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Check size={9} color="#fff" strokeWidth={4} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#2D6E3E", letterSpacing: 0.4, textTransform: "uppercase" }}>
                                {lang === "uz" ? "Original sifat" : "Оригинальное качество"}
                            </span>
                        </div>

                        {/* Name */}
                        <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: -0.3, color: "#0F1410", lineHeight: 1.3, margin: "0 0 8px" }}>
                            {name}
                        </h1>

                        {/* Rating */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                            <div style={{ display: "flex", gap: 2 }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={13} fill="#F6B100" color="#F6B100" />
                                ))}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#737D75" }}>
                                5.0 ({lang === "uz" ? "Yangi mahsulot" : "Новый товар"})
                            </span>
                        </div>

                        {/* Price Card */}
                        <div className="glass-card" style={{ padding: "16px 18px", marginBottom: 14 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#737D75", letterSpacing: 0.3, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                                {lang === "uz" ? "Narxi" : "Цена"}
                            </span>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: payload.oldPrice && payload.oldPrice > payload.price ? "#FF3B30" : "#0F1410" }}>
                                    {fmtPrice(payload.price || 0)}
                                </span>
                                {payload.oldPrice && payload.oldPrice > payload.price && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 14, fontWeight: 500, color: "#9AA29C", textDecoration: "line-through" }}>
                                            {fmtPrice(payload.oldPrice)}
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 700, background: "#FF3B30", color: "#fff", borderRadius: 8, padding: "2px 7px" }}>
                                            -{Math.round(((payload.oldPrice - payload.price) / payload.oldPrice) * 100)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ========================================================================= */}
            {/* DESKTOP ONLY OVERLAYS (>= 768px)                                          */}
            {/* ========================================================================= */}
            {!isMobile && (
                <>
                    {/* Breadcrumbs (top: 160px) */}
                    <div
                        style={{
                            position: "fixed",
                            top: 160,
                            left: contentLeft,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#9CA3AF",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            opacity: showInfo ? 1 : 0,
                            transition: `opacity ${INFO_SLIDE_MS}ms ease-out`,
                            zIndex: 255,
                            pointerEvents: "none",
                        }}
                    >
                        <span>{lang === "uz" ? "MAHSULOTLAR" : "ТОВАРЫ"}</span>
                        <span>/</span>
                        <span style={{ color: "#111612", fontStyle: "italic" }}>{name}</span>
                    </div>

                    {/* Left Thumbnails Column: Matches w-40 (160px) on the left */}
                    <div
                        style={{
                            position: "fixed",
                            top: desktopHeroTop,
                            left: desktopThumbLeft,
                            width: desktopThumbWidth,
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                            opacity: showInfo ? 1 : 0,
                            transform: showInfo ? "translateY(0)" : "translateY(16px)",
                            transition: `opacity ${INFO_SLIDE_MS}ms ease-out, transform ${INFO_SLIDE_MS}ms ${FIRM_EASE}`,
                            zIndex: 255,
                            pointerEvents: "none",
                        }}
                    >
                        <div
                            className="aspect-[3/4] rounded-3xl overflow-hidden border-2 border-black scale-95 shadow-xl relative bg-gray-50"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={activeImageSrc}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="aspect-[3/4] rounded-3xl overflow-hidden border-2 border-gray-100 opacity-40 bg-gray-100" />
                        <div className="aspect-[3/4] rounded-3xl overflow-hidden border-2 border-gray-100 opacity-20 bg-gray-100" />
                    </div>

                    {/* Right Column Info Panel: Matches ProductClient.tsx col-5 */}
                    <div
                        style={{
                            position: "fixed",
                            top: desktopInfoTop,
                            left: desktopInfoLeft,
                            width: desktopInfoWidth,
                            opacity: showInfo ? 1 : 0,
                            transform: showInfo ? "translateY(0)" : "translateY(-16px)",
                            transition: `opacity ${INFO_SLIDE_MS}ms ease-out, transform ${INFO_SLIDE_MS}ms ${FIRM_EASE}`,
                            zIndex: 261,
                            pointerEvents: "none",
                        }}
                    >
                        <div className="bg-white p-8 lg:p-10 rounded-[32px] border border-gray-100 shadow-sm">
                            <p className="text-2xl lg:text-3xl font-semibold tracking-tight text-[#111612] mb-3 leading-snug">
                                {name}
                            </p>
                            <div className="flex items-center gap-2 mb-6 bg-gray-50/70 w-fit px-3.5 py-1.5 rounded-xl">
                                <Star size={15} className="text-yellow-400 fill-yellow-400" />
                                <span className="font-semibold text-xs text-[#111612]">5.0</span>
                                <span className="text-xs text-gray-400 font-medium ml-1.5">({lang === "uz" ? "Yangi mahsulot" : "Новый товар"})</span>
                            </div>

                            <div className="flex flex-col gap-1 mb-6">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    {lang === "uz" ? "Narxi" : "Цена"}
                                </p>
                                <div className="flex items-baseline gap-4">
                                    <div className="text-3xl lg:text-4xl font-bold tracking-tight text-[#111612]">
                                        {payload.price?.toLocaleString()} <span className="text-xl font-normal text-gray-500">{lang === "uz" ? "so'm" : "сум"}</span>
                                    </div>
                                    {payload.oldPrice && payload.oldPrice > payload.price && (
                                        <span className="text-gray-300 line-through font-medium text-xl">
                                            {payload.oldPrice.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-green-50 p-4 rounded-3xl border border-green-100 mb-6">
                                <div className="p-2 bg-green-100 text-green-600 rounded-2xl"><Check size={18} strokeWidth={3} /></div>
                                <p className="text-xs font-black text-gray-700 uppercase tracking-tighter">
                                    {lang === "uz" ? "Mavjud" : "В наличии"}: <span className="text-black">{lang === "uz" ? "Omborda bor" : "Есть на складе"}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ========================================================================= */}
            {/* EXPANDING HERO ELEMENT (Shared element: glides from card rect into place)  */}
            {/* ========================================================================= */}
            <div style={boxStyle}>
                <div className="relative w-full h-full bg-[#F5F5F0]">
                    {isVideo ? (
                        <video
                            src={payload.image}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={activeImageSrc}
                            alt={name}
                            className={`w-full h-full select-none pointer-events-none ${isMobile ? "object-cover" : "object-contain p-4 md:p-6"}`}
                            draggable={false}
                        />
                    )}

                    {/* Desktop Hero Controls (Heart + Zoom hint) */}
                    {!isMobile && (
                        <>
                            <div
                                style={{
                                    position: "absolute",
                                    top: 32,
                                    left: 32,
                                    padding: "10px 14px",
                                    background: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(16px)",
                                    borderRadius: 16,
                                    border: "1px solid #fff",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#374151",
                                    opacity: showInfo ? 1 : 0,
                                    transition: `opacity ${INFO_SLIDE_MS}ms ease-out`,
                                    pointerEvents: "none",
                                }}
                            >
                                <Maximize2 size={16} />
                                <span>{lang === "uz" ? "Kattalashtirish" : "Увеличить"}</span>
                            </div>
                            <div
                                style={{
                                    position: "absolute",
                                    top: 32,
                                    right: 32,
                                    padding: 20,
                                    background: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(16px)",
                                    borderRadius: "50%",
                                    border: "1px solid #fff",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                                    color: "#000",
                                    opacity: showInfo ? 1 : 0,
                                    transition: `opacity ${INFO_SLIDE_MS}ms ease-out`,
                                    pointerEvents: "none",
                                }}
                            >
                                <Heart size={24} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
