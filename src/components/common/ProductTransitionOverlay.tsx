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

                // Start expansion on the very next render frame
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsExpanded(true);
                    });
                });

                // Safety timeout: If navigation doesn't finish within 600ms, gently dismiss
                timeoutRef.current = setTimeout(() => {
                    handleDismiss();
                }, 600);
            } else {
                handleDismiss();
            }
        });

        // Popstate / back button resets immediately
        const handlePopstate = () => {
            productTransitionManager.clear();
            setPayload(null);
        };
        window.addEventListener("popstate", handlePopstate);

        return () => {
            unsubscribe();
            window.removeEventListener("popstate", handlePopstate);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        };
    }, []);

    // When pathname changes to the product detail page, initiate smooth handoff
    useEffect(() => {
        if (payload && pathname?.includes("/products/")) {
            // Give Next.js 50ms to paint the real product page under the overlay, then fade out
            const timer = setTimeout(() => {
                handleDismiss();
            }, 60);
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
        }, 180);
    };

    if (!payload) return null;

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : true;
    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 390;

    // Destination dimensions (matching ProductMedia.tsx aspect-3/4 on mobile & desktop)
    const targetWidth = isMobile
        ? Math.min(windowWidth - 40, 480)
        : Math.min(540, windowWidth * 0.4);
    const targetHeight = targetWidth * (4 / 3);
    const targetTop = isMobile ? 8 : 72;
    const targetLeft = isMobile
        ? 20
        : Math.max(40, (windowWidth - targetWidth) / 2 - 160);

    // Current animated box style
    const boxStyle: React.CSSProperties = {
        position: "fixed",
        top: isExpanded ? targetTop : payload.rect.top,
        left: isExpanded ? targetLeft : payload.rect.left,
        width: isExpanded ? targetWidth : payload.rect.width,
        height: isExpanded ? targetHeight : payload.rect.height,
        borderRadius: isExpanded ? 28 : 24,
        background: "#ffffff",
        overflow: "hidden",
        boxShadow: isExpanded
            ? "0 20px 40px rgba(15,20,16,0.12), 0 1px 3px rgba(15,20,16,0.04)"
            : "0 4px 20px rgba(15,20,16,0.06)",
        transition: "all 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: 100,
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
            className="fixed inset-0 z-[99] pointer-events-none"
            style={{
                opacity: isFadingOut ? 0 : 1,
                transition: "opacity 160ms ease-out",
            }}
            aria-hidden="true"
        >
            {/* Backdrop that fades in to cover the background cleanly */}
            <div
                className="absolute inset-0 bg-[#FAFAF6]"
                style={{
                    opacity: isExpanded ? 0.96 : 0,
                    transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
            />

            {/* Expanding Shared Card Element */}
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
                            sizes={isMobile ? "90vw" : "540px"}
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

            {/* Smooth Title & Price Expansion Below Target Image */}
            <div
                style={{
                    position: "fixed",
                    top: targetTop + targetHeight + 16,
                    left: targetLeft,
                    width: targetWidth,
                    opacity: isExpanded ? 1 : 0,
                    transform: isExpanded ? "translateY(0)" : "translateY(16px)",
                    transition: "all 240ms cubic-bezier(0.22, 1, 0.36, 1) 60ms",
                    zIndex: 101,
                }}
            >
                <h2 className="text-[19px] font-bold text-[#111612] line-clamp-2 leading-snug tracking-tight">
                    {name}
                </h2>
                <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-[18px] font-extrabold text-[#2D6E3E]">
                        {fmtPrice(payload.price)}
                    </span>
                    {payload.oldPrice && payload.oldPrice > payload.price && (
                        <span className="text-[13px] text-gray-400 line-through font-semibold">
                            {fmtPrice(payload.oldPrice)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
