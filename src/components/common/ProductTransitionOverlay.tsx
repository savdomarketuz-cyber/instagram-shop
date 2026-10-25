"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { productTransitionManager, type TransitionProductPayload } from "@/lib/product-transition";
import { getOptimizedImageUrl, hasVariants, makeVariantLoader, getMetaForUrl } from "@/lib/imageVariants";

const EXPAND_DURATION_MS = 340;

export default function ProductTransitionOverlay({ lang = "uz" }: { lang?: string }) {
    const pathname = usePathname();
    const [payload, setPayload] = useState<TransitionProductPayload | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const startTimeRef = useRef<number>(0);
    const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
    const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Subscribe to product transition trigger
    useEffect(() => {
        const unsubscribe = productTransitionManager.subscribe((newPayload) => {
            if (newPayload) {
                if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
                if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

                startTimeRef.current = Date.now();
                setPayload(newPayload);
                setIsExpanded(false);
                setIsFadingOut(false);

                // Start expansion on the next animation frame
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsExpanded(true);
                    });
                });

                // Safety timeout: dismiss after 3s if user aborts or navigation fails
                safetyTimerRef.current = setTimeout(() => {
                    dismissOverlay();
                }, 3000);
            } else {
                dismissOverlay();
            }
        });

        // Browser back/forward button resets immediately
        const handlePopstate = () => {
            productTransitionManager.clear();
            setPayload(null);
            setIsExpanded(false);
            setIsFadingOut(false);
        };
        window.addEventListener("popstate", handlePopstate);

        return () => {
            unsubscribe();
            window.removeEventListener("popstate", handlePopstate);
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        };
    }, []);

    // When the target product page is mounted by Next.js
    useEffect(() => {
        if (payload && pathname?.includes("/products/")) {
            // Calculate how much of the expansion animation has elapsed
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, EXPAND_DURATION_MS - elapsed);

            // Wait until expansion is 100% finished before dissolving into the real page
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = setTimeout(() => {
                dismissOverlay();
            }, remaining + 20);
        }
    }, [pathname, payload]);

    const dismissOverlay = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setPayload(null);
            setIsExpanded(false);
            setIsFadingOut(false);
            productTransitionManager.clear();
        }, 140);
    };

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
        transition: `all ${EXPAND_DURATION_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1)`,
        zIndex: 260,
        willChange: "top, left, width, height, border-radius",
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
                transition: "opacity 140ms ease-out",
            }}
            aria-hidden="true"
        >
            {/* Smooth full-screen backdrop */}
            <div
                className="absolute inset-0 bg-[#FAFAF6]"
                style={{
                    opacity: isExpanded ? 0.98 : 0,
                    transition: `opacity ${EXPAND_DURATION_MS - 40}ms ease-out`,
                }}
            />

            {/* Expanding Card Hero Element */}
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

            {/* Product Title and Price Expansion */}
            <div
                style={{
                    position: "fixed",
                    top: infoTop,
                    left: infoLeft,
                    width: infoWidth,
                    opacity: isExpanded ? 1 : 0,
                    transform: isExpanded ? "translateY(0)" : "translateY(20px)",
                    transition: `all ${EXPAND_DURATION_MS - 40}ms cubic-bezier(0.2, 0.9, 0.3, 1) 40ms`,
                    zIndex: 261,
                }}
            >
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
