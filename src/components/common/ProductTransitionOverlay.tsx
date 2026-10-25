"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, Heart, Search, Check, Star, Maximize2, ShoppingBag } from "lucide-react";
import { productTransitionManager, type TransitionProductPayload } from "@/lib/product-transition";

// Snappy firm timing (Total ~0.74s sequence):
// 1) 0ms -> 360ms: Image expands firmly into 1:1 destination (Desktop: col-7 hero, Mobile: left 85vw)
// 2) 360ms -> 640ms: Desktop (thumbnails + right info panel) / Mobile (info + top controls) slide firmly into place
// 3) Synchronized completion: When animation finishes (640ms) AND real page mounts -> 100ms smooth dissolve
const IMAGE_EXPAND_MS = 360;
const INFO_SLIDE_MS = 280;
const FADE_OUT_DURATION = 100;
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

    const animDoneRef = useRef(false);
    const destReadyRef = useRef(false);

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
        animDoneRef.current = false;
        destReadyRef.current = false;
        productTransitionManager.clear();
    };

    const triggerFadeOut = () => {
        setIsFadingOut(true);
        timerDoneRef.current = setTimeout(() => {
            resetState();
        }, FADE_OUT_DURATION);
    };

    const tryComplete = () => {
        if (animDoneRef.current && destReadyRef.current) {
            triggerFadeOut();
        }
    };

    // Subscribe to product transition trigger & destination readiness
    useEffect(() => {
        const unsubscribe = productTransitionManager.subscribe((newPayload) => {
            if (newPayload) {
                clearAllTimers();
                if (typeof window !== "undefined") {
                    setWindowWidth(window.innerWidth);
                }
                setPayload(newPayload);
                setIsExpanded(false);
                setShowInfo(false);
                setIsFadingOut(false);
                animDoneRef.current = false;
                destReadyRef.current = productTransitionManager.isReady();

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

                // Stage 3: Animation complete at 640ms — check if destination is already mounted
                timerFadeRef.current = setTimeout(() => {
                    animDoneRef.current = true;
                    tryComplete();
                }, IMAGE_EXPAND_MS + INFO_SLIDE_MS);

                // Safety timeout: dismiss after 2.5s if unexpected error occurs
                safetyTimerRef.current = setTimeout(() => {
                    resetState();
                }, 2500);
            } else {
                resetState();
            }
        });

        const unsubReady = productTransitionManager.subscribeReady(() => {
            destReadyRef.current = true;
            tryComplete();
        });

        const handlePopstate = () => {
            resetState();
        };
        window.addEventListener("popstate", handlePopstate);

        return () => {
            unsubscribe();
            unsubReady();
            window.removeEventListener("popstate", handlePopstate);
            clearAllTimers();
        };
    }, []);

    if (!payload) return null;

    const currentWindowWidth = typeof window !== "undefined" ? window.innerWidth : windowWidth;
    const isMobile = currentWindowWidth < 768;

    // --- 1:1 EMPIRICALLY VERIFIED GEOMETRY ---

    // 1. Mobile Geometry (< 768px): Matches ProductMedia carousel (top: 8px, left: 0px, width: 85vw) + ProductInfo
    const mobileImgWidth = currentWindowWidth * 0.85; // exactly 85vw
    const mobileImgHeight = mobileImgWidth * (4 / 3); // aspect-[3/4]
    const mobileImgTop = 8; // pt-2 (8px)
    const mobileImgLeft = 0; // STRICTLY FLUSH LEFT (matches real ProductMedia first child at left: 0)
    const mobileImgRadius = 28; // rounded-[28px]
    const mobileInfoTop = mobileImgTop + mobileImgHeight + 24; // pb-6 ends, ProductInfo begins

    // 2. Desktop Geometry (>= 768px): Matches ProductClient (max-w-[1600px] px-10 py-12, 12-col grid)
    const containerWidth = Math.min(1600, currentWindowWidth);
    const containerLeft = (currentWindowWidth - containerWidth) / 2;
    const contentLeft = containerLeft + 40; // px-10 left margin
    const availableWidth = containerWidth - 80;

    const isLg = currentWindowWidth >= 1024;
    const col7Width = isLg ? (availableWidth - 64) * (7 / 12) : availableWidth;
    const col5Width = isLg ? (availableWidth - 64) * (5 / 12) : availableWidth;

    // Desktop Left Gallery:
    const desktopThumbLeft = contentLeft;
    const desktopThumbWidth = 160; // w-40 (160px)
    const desktopHeroLeft = contentLeft + 200; // after 160px thumbnails + 40px gap
    const desktopHeroWidth = Math.min(620, Math.max(380, col7Width - 200));
    const desktopHeroHeight = 800; // Matches fixed h-[800px] in ProductClient.tsx exactly
    const desktopHeroTop = 216; // header (~112px) + py-12 (~48px) + breadcrumbs (~56px) = exactly 216px
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
                    {/* Floating Top Controls (Matches ProductMedia.tsx 1:1, Zero-milky opacity, immediate yield on real page mount) */}
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
                            opacity: isFadingOut ? 0 : (showInfo ? 1 : 0),
                            pointerEvents: "none",
                        }}
                    >
                        {/* Left Group */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                transform: showInfo ? "scale(1)" : "scale(0.3)",
                                transformOrigin: "top left",
                                transition: `transform ${INFO_SLIDE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                            }}
                        >
                            <div className="glass-icon-button w-11 h-11 text-[#111612]">
                                <ChevronLeft size={20} strokeWidth={2} />
                            </div>
                            <div className="glass-icon-button w-11 h-11 text-[#111612]">
                                <Search size={19} strokeWidth={2} />
                            </div>
                        </div>

                        {/* Right Group (Exact 2 buttons: Share + Heart) */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                transform: showInfo ? "scale(1)" : "scale(0.3)",
                                transformOrigin: "top right",
                                transition: `transform ${INFO_SLIDE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                            }}
                        >
                            <div className="glass-icon-button w-11 h-11 text-[#111612]">
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                    <polyline points="16 6 12 2 8 6" />
                                    <line x1="12" y1="2" x2="12" y2="15" />
                                </svg>
                            </div>
                            <div className="glass-icon-button w-11 h-11 text-[#111612]">
                                <Heart size={19} strokeWidth={2} fill="none" color="currentColor" />
                            </div>
                        </div>
                    </div>

                    {/* Mobile Slide 2 Peek Preview (slides in from left to right with blur-to-sharp effect) */}
                    <div
                        style={{
                            position: "fixed",
                            top: mobileImgTop,
                            left: mobileImgWidth + 12,
                            width: mobileImgWidth,
                            height: mobileImgHeight,
                            borderRadius: mobileImgRadius,
                            background: "#F5F5F0",
                            border: "1px solid #F3F4F6",
                            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                            opacity: showInfo ? 1 : 0,
                            transform: showInfo ? "translateX(0)" : "translateX(-48px)",
                            filter: showInfo ? "blur(0px)" : "blur(10px)",
                            transition: `opacity ${INFO_SLIDE_MS + 40}ms ease-out, transform ${INFO_SLIDE_MS + 40}ms ${FIRM_EASE}, filter ${INFO_SLIDE_MS + 40}ms ease-out`,
                            zIndex: 259,
                            pointerEvents: "none",
                            overflow: "hidden",
                        }}
                    >
                        {payload.secondImgSrc ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={payload.secondImgSrc}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-100/60" />
                        )}
                    </div>

                    {/* Instagram Style Dynamic Dots Pagination (Water drop / ripple spring entry) */}
                    {(payload.images && payload.images.length > 1) && (
                        <div
                            style={{
                                position: "fixed",
                                top: mobileImgTop + mobileImgHeight - 16,
                                left: 0,
                                width: mobileImgWidth,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                zIndex: 262,
                                opacity: isFadingOut ? 0 : (showInfo ? 1 : 0),
                                transform: showInfo ? "scale(1)" : "scale(0.3)",
                                transition: `opacity ${INFO_SLIDE_MS}ms ease-out, transform ${INFO_SLIDE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                                pointerEvents: "none",
                            }}
                        >
                            <div style={{ width: 20, height: 6, background: "#000", borderRadius: 999 }} />
                            <div style={{ width: 6, height: 6, background: "rgba(0,0,0,0.25)", borderRadius: "50%" }} />
                            {payload.images.length > 2 && (
                                <div style={{ width: 5, height: 5, background: "rgba(0,0,0,0.15)", borderRadius: "50%" }} />
                            )}
                        </div>
                    )}

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
                        {/* Original badge (only if product is actually original) */}
                        {payload.isOriginal && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EAF3EC", borderRadius: 10, padding: "6px 12px", marginBottom: 12 }}>
                                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#2D6E3E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Check size={9} color="#fff" strokeWidth={4} />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 800, color: "#2D6E3E", letterSpacing: 0.4, textTransform: "uppercase" }}>
                                    {lang === "uz" ? "Original sifat" : "Оригинальное качество"}
                                </span>
                            </div>
                        )}

                        {/* Name */}
                        <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: -0.3, color: "#0F1410", lineHeight: 1.3, margin: "0 0 8px" }}>
                            {name}
                        </h1>

                        {/* Rating - Matches ProductInfo.tsx exactly */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                            <div style={{ display: "flex", gap: 2 }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={13}
                                        fill={(payload.rating || 0) > i ? "#F6B100" : "none"}
                                        color={(payload.rating || 0) > i ? "#F6B100" : "#D0D5CF"}
                                    />
                                ))}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#737D75" }}>
                                {(payload.reviewCount || 0) > 0
                                    ? `${(payload.rating || 0).toFixed(1)} (${payload.reviewCount} ${lang === "uz" ? "sharh" : "отзыв"})`
                                    : (lang === "uz" ? "Yangi mahsulot" : "Новый товар")}
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

                    {/* Mobile Floating Sticky CTA — Slides UP smoothly from bottom */}
                    <div 
                        className="fixed bottom-3 left-3 right-3 max-w-lg mx-auto z-[262] glass-strong rounded-[24px] p-2 border border-white/80 shadow-[0_12px_36px_rgba(28,70,42,0.18)] select-none pointer-events-none"
                        style={{
                            paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)",
                            opacity: showInfo ? 1 : 0,
                            transform: showInfo ? "translateY(0)" : "translateY(120%)",
                            transition: `opacity ${INFO_SLIDE_MS}ms ease-out, transform ${INFO_SLIDE_MS}ms ${FIRM_EASE}`,
                        }}
                    >
                        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                            {/* Tezkor xarid (Secondary Action) */}
                            <div
                                className="glass-tinted-button text-xs font-semibold flex items-center justify-center text-[#111612]"
                                style={{
                                    flexShrink: 0, height: 48, borderRadius: 16, padding: "0 16px",
                                }}
                            >
                                {lang === "uz" ? "Tezkor xarid" : "Купить"}
                            </div>

                            {/* Cart CTA (Primary Action) */}
                            <div
                                className="glass-prominent-button flex-1 text-xs font-semibold"
                                style={{
                                    height: 48, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff",
                                }}
                            >
                                <ShoppingBag size={18} color="#fff" strokeWidth={2} />
                                <span>{lang === "uz" ? "Savatga qo'shish" : "В корзину"}</span>
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
                            
                            {/* Rating (Matches ProductClient.tsx desktop: only shown if reviewCount > 0) */}
                            {(payload.reviewCount || 0) > 0 && (
                                <div className="flex items-center gap-2 mb-6 bg-gray-50/70 w-fit px-3.5 py-1.5 rounded-xl">
                                    <Star size={15} className="text-yellow-400 fill-yellow-400" />
                                    <span className="font-semibold text-xs text-[#111612]">{(payload.rating || 5.0).toFixed(1)}</span>
                                    <span className="text-xs text-gray-400 font-medium ml-1.5">({payload.reviewCount} {lang === "uz" ? "ta sharh" : "отзывов"})</span>
                                </div>
                            )}

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

                            {/* Desktop Action Buttons */}
                            <div className="flex gap-3 items-stretch mt-6">
                                <div className="glass-tinted-button flex-1 h-[52px] text-sm font-semibold rounded-[var(--radius-control)] flex items-center justify-center text-[#111612]">
                                    {lang === 'uz' ? "Tezkor xarid" : "Купить сейчас"}
                                </div>
                                <div className="glass-prominent-button flex-1 h-[52px] text-sm font-semibold rounded-[var(--radius-control)] flex items-center justify-center gap-2 text-white">
                                    <ShoppingBag size={18} strokeWidth={2} />
                                    <span>{lang === 'uz' ? "Savatga qo'shish" : "В корзину"}</span>
                                </div>
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
