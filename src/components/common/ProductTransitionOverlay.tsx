"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { productTransitionManager, type TransitionProductPayload } from "@/lib/product-transition";
import { getOptimizedImageUrl, hasVariants, makeVariantLoader, getMetaForUrl } from "@/lib/imageVariants";

export default function ProductTransitionOverlay({ lang = "uz" }: { lang?: string }) {
    const pathname = usePathname();
    const [payload, setPayload] = useState<TransitionProductPayload | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Subscribe to transition events
    useEffect(() => {
        const unsubscribe = productTransitionManager.subscribe((newPayload) => {
            if (newPayload) {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

                setPayload(newPayload);
                setIsExpanded(false);
                setIsFadingOut(false);

                // Start expansion on next animation frame
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsExpanded(true);
                    });
                });

                // Safety timeout: only if route navigation fails completely (3 seconds)
                timeoutRef.current = setTimeout(() => {
                    handleDismiss();
                }, 3000);
            } else {
                handleDismiss();
            }
        });

        // Popstate / back button resets immediately
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
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        };
    }, []);

    // When pathname changes to product detail page, handoff smoothly
    useEffect(() => {
        if (payload && pathname?.includes("/products/")) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [pathname, payload]);

    const handleDismiss = () => {
        setIsFadingOut(true);
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = setTimeout(() => {
            setPayload(null);
            setIsExpanded(false);
            setIsFadingOut(false);
            productTransitionManager.clear();
        }, 220);
    };

    if (!payload) return null;

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 1024 : true;
    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 390;

    // --- EXACT TARGET POSITIONING ---
    // Mobile: at top (under minimal status bar) with px-5
    // Desktop: in left gallery column (NOT center), exactly where ProductClient renders it!
    let targetTop = 16;
    let targetLeft = 20;
    let targetWidth = Math.min(windowWidth - 40, 480);
    let targetHeight = targetWidth * (4 / 3);
    let targetBorderRadius = 28;

    // Desktop Info position (to the right of the image)
    let infoTop = targetTop + targetHeight + 16;
    let infoLeft = targetLeft;
    let infoWidth = targetWidth;

    if (!isMobile) {
        const containerWidth = Math.min(1600, windowWidth);
        const containerLeft = (windowWidth - containerWidth) / 2;
        const contentLeft = containerLeft + 40; // px-10

        // In ProductClient: 12-col grid. Left col-7 has thumbnails (160px) + gap-10 (40px) = 200px
        const galleryLeft = contentLeft + 200;
        const availableCol7 = (containerWidth - 80) * (7 / 12) - 40;
        const mainImgW = Math.min(620, Math.max(420, availableCol7 - 200));

        targetTop = 180; // Below header (~112px) + py-12 breadcrumbs (~60px)
        targetLeft = galleryLeft;
        targetWidth = mainImgW;
        targetHeight = Math.min(760, mainImgW * (4 / 3));
        targetBorderRadius = 40; // matches ProductClient rounded-[40px]

        // Right side info (col-5)
        infoTop = targetTop + 20;
        infoLeft = targetLeft + targetWidth + 48; // gap-16
        infoWidth = Math.min(480, (containerWidth - 80) * (5 / 12) - 40);
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
        transition: "all 480ms cubic-bezier(0.16, 1, 0.3, 1)",
        zIndex: 260, // Above header (z-90 / z-120)
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
                transition: "opacity 220ms ease-out",
            }}
            aria-hidden="true"
        >
            {/* Full-screen clean backdrop that covers the old page smoothly */}
            <div
                className="absolute inset-0 bg-[#FAFAF6]"
                style={{
                    opacity: isExpanded ? 0.98 : 0,
                    transition: "opacity 420ms cubic-bezier(0.16, 1, 0.3, 1)",
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
                    transform: isExpanded ? "translateY(0)" : "translateY(24px)",
                    transition: "all 440ms cubic-bezier(0.16, 1, 0.3, 1) 120ms",
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
