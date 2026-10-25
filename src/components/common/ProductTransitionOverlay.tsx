"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { productTransitionManager, type TransitionProductPayload } from "@/lib/product-transition";
import { getOptimizedImageUrl, hasVariants, makeVariantLoader, getMetaForUrl } from "@/lib/imageVariants";

// 1-second staged choreography:
// 1) 0ms -> 480ms: Only the image expands from card to hero
// 2) 480ms -> 860ms: Details (title, badge, price) slide down into place
// 3) 900ms -> 1040ms: Smooth 140ms fade-out into the mounted product page
const IMAGE_EXPAND_MS = 480;
const INFO_SLIDE_MS = 380;
const FADE_OUT_START_MS = 900;
const FADE_OUT_DURATION = 140;
const CLEANUP_MS = 1060;

export default function ProductTransitionOverlay({ lang = "uz" }: { lang?: string }) {
    const [payload, setPayload] = useState<TransitionProductPayload | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

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

                // Phase 1: Card image expands to hero (starts on next frame)
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsExpanded(true);
                    });
                });

                // Phase 2: After image expansion completes (480ms), show & slide down product info
                timerInfoRef.current = setTimeout(() => {
                    setShowInfo(true);
                }, IMAGE_EXPAND_MS);

                // Phase 3: At 900ms, start gentle fade-out into underlying page
                timerFadeRef.current = setTimeout(() => {
                    setIsFadingOut(true);
                }, FADE_OUT_START_MS);

                // Phase 4: Overlay cleanup at 1060ms (~1s total choreography complete)
                timerDoneRef.current = setTimeout(() => {
                    resetState();
                }, CLEANUP_MS);

                // Safety timeout: dismiss after 3s if navigation fails or aborts
                safetyTimerRef.current = setTimeout(() => {
                    resetState();
                }, 3000);
            } else {
                resetState();
            }
        });

        // Browser back/forward button resets immediately
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

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 1024 : true;
    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 390;

    // --- PIXEL-MATCHING DESTINATION POSITIONS ---
    let targetTop = 14;
    let targetLeft = 20;
    let targetWidth = Math.min(windowWidth - 40, 480);
    let targetHeight = targetWidth * (4 / 3);
    let targetBorderRadius = 28;

    let infoTop = targetTop + targetHeight + 16;
    let infoLeft = targetLeft;
    let infoWidth = targetWidth;

    if (!isMobile) {
        const containerWidth = Math.min(1600, windowWidth);
        const containerLeft = (windowWidth - containerWidth) / 2;
        const contentLeft = containerLeft + 40; // px-10

        // In ProductClient: 12-col grid. Left col-7 has thumbnails (160px) + gap-10 (40px) = 200px
        const availableWidth = containerWidth - 80;
        const col7Width = (availableWidth - 64) * (7 / 12);
        const mainImgW = Math.min(620, Math.max(380, col7Width - 200));

        targetTop = 175; // Below header (~112px) + py-12 breadcrumbs (~60px)
        targetLeft = contentLeft + 200;
        targetWidth = mainImgW;
        targetHeight = Math.min(760, mainImgW * (4 / 3));
        targetBorderRadius = 40; // matches ProductClient rounded-[40px]

        // Right side info (col-5)
        infoTop = targetTop + 16;
        infoLeft = targetLeft + targetWidth + 56;
        infoWidth = Math.min(480, (availableWidth - 64) * (5 / 12));
    }

    const boxStyle: React.CSSProperties = {
        position: "fixed",
        top: isExpanded ? targetTop : payload.rect.top,
        left: isExpanded ? targetLeft : payload.rect.left,
        width: isExpanded ? targetWidth : payload.rect.width,
        height: isExpanded ? targetHeight : payload.rect.height,
        borderRadius: isExpanded ? targetBorderRadius : 24,
        background: "#ffffff",
        overflow: "hidden",
        boxShadow: isExpanded
            ? "0 25px 50px -12px rgba(15,20,16,0.18), 0 2px 8px rgba(15,20,16,0.06)"
            : "0 4px 20px rgba(15,20,16,0.06)",
        transition: `top ${IMAGE_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), left ${IMAGE_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), width ${IMAGE_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), height ${IMAGE_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), border-radius ${IMAGE_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow ${IMAGE_EXPAND_MS}ms ease-out`,
        zIndex: 260,
        willChange: "top, left, width, height, border-radius",
    };

    const infoStyle: React.CSSProperties = {
        position: "fixed",
        top: infoTop,
        left: infoLeft,
        width: infoWidth,
        opacity: showInfo ? 1 : 0,
        transform: showInfo ? "translateY(0)" : "translateY(-20px)",
        transition: `opacity ${INFO_SLIDE_MS}ms ease-out, transform ${INFO_SLIDE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        zIndex: 261,
        pointerEvents: "none",
    };

    const name = (lang === "ru" ? payload.name_ru : payload.name_uz) || payload.name;
    const fmtPrice = (n: number) => {
        return n.toLocaleString("ru-RU") + (lang === "ru" ? " сум" : " so'm");
    };

    const meta = getMetaForUrl(payload.image_metadata, payload.image);
    const isVideo = payload.image?.toLowerCase().endsWith(".mp4");

    return (
        <div
            className={`fixed inset-0 z-[250] ${isFadingOut ? "pointer-events-none" : "pointer-events-auto"}`}
            style={{
                opacity: isFadingOut ? 0 : 1,
                transition: `opacity ${FADE_OUT_DURATION}ms ease-out`,
            }}
            aria-hidden="true"
        >
            {/* Smooth full-screen backdrop */}
            <div
                className="absolute inset-0 bg-[#FAFAF6]"
                style={{
                    opacity: isExpanded ? 1 : 0,
                    transition: `opacity ${IMAGE_EXPAND_MS - 40}ms ease-out`,
                }}
            />

            {/* Stage 1: Expanding Card Hero Element */}
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
                        <Image
                            src={getOptimizedImageUrl(payload.image_metadata, payload.image, "md")}
                            alt={name}
                            fill
                            priority
                            sizes={isMobile ? "95vw" : "620px"}
                            className="object-cover"
                            loader={
                                hasVariants(payload.image_metadata, payload.image)
                                    ? makeVariantLoader(payload.image_metadata)
                                    : undefined
                            }
                            placeholder={meta?.blurDataURL ? "blur" : "empty"}
                            blurDataURL={meta?.blurDataURL}
                        />
                    )}
                </div>
            </div>

            {/* Stage 2: Product Title and Price slide down beneath the image */}
            <div style={infoStyle}>
                <div className="inline-block px-3 py-1 bg-[#EAF3EC] text-[#2D6E3E] rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2">
                    {lang === "uz" ? "Original sifat" : "Оригинальное качество"}
                </div>
                <h2 className="text-[20px] lg:text-[26px] font-bold text-[#111612] line-clamp-2 leading-snug tracking-tight">
                    {name}
                </h2>
                <div className="flex items-baseline gap-3 mt-3">
                    <span className="text-[20px] lg:text-[24px] font-extrabold text-[#2D6E3E]">
                        {fmtPrice(payload.price)}
                    </span>
                    {payload.oldPrice && payload.oldPrice > payload.price && (
                        <span className="text-[14px] text-gray-400 line-through font-semibold">
                            {fmtPrice(payload.oldPrice)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
