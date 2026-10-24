"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Banner } from "@/types";
import { videoPreWarmer } from "@/lib/videoPreWarmer";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface BannerSectionProps {
    banners: Banner[];
    language: "uz" | "ru";
    /** Desktop uchun qat'iy balandlik (px) */
    heightPx?: number;
    /** Mobil uchun nisbat (masalan "16/10") — heightPx o'rniga ishlatiladi */
    aspectRatio?: string;
    borderRadius?: number;
    /** bare=true bo'lsa tashqi margin/padding berilmaydi (grid ustuni ichida) */
    bare?: boolean;
    /** Avtomatik almashinish oralig'i (ms). 0 bo'lsa avtomatik o'chadi. */
    intervalMs?: number;
    /** Mobil ko'rinish uchun tashqi padding (px qiymat string) */
    outerPadding?: string;
}

const TRANSITION = "transform 460ms cubic-bezier(0.32, 0.72, 0, 1)";

const SHADOW_BASE_STYLE =
    ":host{display:block;width:100%;height:100%;overflow:hidden;contain:layout paint style}" +
    ".vlr-banner-body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;position:relative;box-sizing:border-box}" +
    ".is-paused,.is-paused *{animation-play-state:paused !important;}";

/**
 * Banner HTML ichidagi <style> qoidalaridagi mustaqil `html` / `body` / `:root`
 * selektorlarini Shadow DOM ichidagi `.vlr-banner-body` wrapperga xavfsiz moslaydi.
 */
function scopeBannerHtml(rawHtml: string): string {
    if (!rawHtml) return "";
    const cleaned = rawHtml
        .replace(/<!DOCTYPE[^>]*>/gi, "")
        .replace(/<\/?(?:html|head|meta|title|base)\b[^>]*>/gi, "")
        .replace(/<\/?body\b[^>]*>/gi, "");

    return cleaned.replace(/<style(\b[^>]*)>([\s\S]*?)<\/style>/gi, (_match, attrs: string, css: string) => {
        const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
        const scopedCss = noComments.replace(/([^{};]+)\{/g, (ruleMatch, rawPrelude: string) => {
            const trimmed = rawPrelude.trim();
            if (!trimmed || trimmed.startsWith("@")) return ruleMatch;
            let updated = rawPrelude.replace(
                /(^|[\s,>+~])html(?:\s*>\s*|\s+)body(?=$|[\s,>+~.:#\[])/gi,
                "$1body"
            );
            updated = updated.replace(
                /(^|[\s,>+~])(?:html|body|:root)(?=$|[\s,>+~.:#\[])/gi,
                "$1.vlr-banner-body"
            );
            return `${updated}{`;
        });
        return `<style${attrs}>${scopedCss}</style>`;
    });
}

interface ShadowBannerSlideProps {
    html: string;
    enabled: boolean;
    isActive: boolean;
    onNavigate: (href: string) => void;
}

function ShadowBannerSlide({ html, enabled, isActive, onNavigate }: ShadowBannerSlideProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;
    const onNavigateRef = useRef(onNavigate);
    onNavigateRef.current = onNavigate;

    useIsoLayoutEffect(() => {
        if (!enabled || !hostRef.current) return;
        const host = hostRef.current;
        const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
        const processedHtml = scopeBannerHtml(html);
        shadow.innerHTML = `<style>${SHADOW_BASE_STYLE}</style><div class="vlr-banner-body ${isActiveRef.current ? "" : "is-paused"}">${processedHtml}</div>`;

        const handleClick = (e: Event) => {
            const me = e as MouseEvent;
            if (me.defaultPrevented || me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
            const path = me.composedPath();
            const anchor = path.find(
                (node): node is HTMLAnchorElement =>
                    typeof HTMLAnchorElement !== "undefined" &&
                    node instanceof HTMLAnchorElement &&
                    !!node.getAttribute("href")
            );
            if (!anchor) return;
            const href = anchor.getAttribute("href")?.trim() || "";
            const target = anchor.getAttribute("target");
            if (!href || href.startsWith("#") || target === "_blank") return;
            if (/^(https?:|mailto:|tel:|javascript:)/i.test(href)) return;
            if (href.startsWith("/")) {
                me.preventDefault();
                onNavigateRef.current(href);
            }
        };

        shadow.addEventListener("click", handleClick);
        return () => {
            shadow.removeEventListener("click", handleClick);
        };
    }, [enabled, html]);

    useIsoLayoutEffect(() => {
        if (!enabled || !hostRef.current?.shadowRoot) return;
        const bodyEl = hostRef.current.shadowRoot.querySelector(".vlr-banner-body");
        if (bodyEl) {
            bodyEl.classList.toggle("is-paused", !isActive);
        }
    }, [enabled, isActive]);

    return (
        <div
            ref={hostRef}
            style={{ width: "100%", height: "100%", contain: "layout paint style" }}
        />
    );
}

export const BannerSection = ({
    banners,
    language,
    heightPx,
    aspectRatio,
    borderRadius = 32,
    bare = false,
    intervalMs = 3000,
    outerPadding,
}: BannerSectionProps) => {
    const router = useRouter();
    // Faqat HTML kontenti bor bannerlar
    const visible = banners
        .filter((b) => (language === "uz" ? b.html_uz : b.html_ru))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const n = visible.length;
    const loop = n > 1;
    // Cheksiz loop uchun oxiriga birinchi slaydning nusxasi qo'shiladi
    const slides = loop ? [...visible, visible[0]] : visible;

    const rootRef = useRef<HTMLDivElement>(null);
    const [isViewportVisible, setIsViewportVisible] = useState(false);
    const [isDocVisible, setIsDocVisible] = useState(true);

    const [idx, setIdx] = useState(0);
    const [prevIdx, setPrevIdx] = useState<number | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [anim, setAnim] = useState(true);

    const idxRef = useRef(0);
    idxRef.current = idx;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const touchX = useRef<number | null>(null);

    const realIdx = n > 0 ? ((idx % n) + n) % n : 0; // dot/holat uchun
    const canAnimate = isViewportVisible && isDocVisible;

    // Komponent haqiqatan ko'rinadigan viewportdami (`offsetWidth > 0`) va sahifa ochiqmi (`visibilityState`)
    useIsoLayoutEffect(() => {
        const el = rootRef.current;
        if (!el) return;

        const checkLayout = () => {
            setIsViewportVisible(el.offsetWidth > 0);
        };
        const checkVisibility = () => {
            setIsDocVisible(document.visibilityState !== "hidden");
        };

        checkLayout();
        checkVisibility();

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(checkLayout);
            ro.observe(el);
        } else {
            window.addEventListener("resize", checkLayout, { passive: true });
        }
        document.addEventListener("visibilitychange", checkVisibility);

        return () => {
            if (ro) ro.disconnect();
            else window.removeEventListener("resize", checkLayout);
            document.removeEventListener("visibilitychange", checkVisibility);
        };
    }, [n]);

    const startAuto = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (!loop || !intervalMs || !canAnimate) return;
        timerRef.current = setInterval(() => {
            setPrevIdx(idxRef.current);
            setIsTransitioning(true);
            setAnim(true);
            setIdx((i) => i + 1);
        }, intervalMs);
    }, [loop, intervalMs, canAnimate]);

    useEffect(() => {
        startAuto();
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [startAuto]);

    // Klon slaydga yetganda — animatsiyasiz boshiga qaytamiz (seamless loop)
    useEffect(() => {
        if (!anim) {
            const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
            return () => cancelAnimationFrame(r);
        }
    }, [anim]);

    // Agar tab almashishi tufayli transitionend kelmay qolsa, zaxira tozalash
    useEffect(() => {
        if (!isTransitioning) return;
        const fallback = setTimeout(() => {
            setIsTransitioning(false);
            setPrevIdx(null);
            if (loop && idxRef.current >= n) {
                setAnim(false);
                setIdx(0);
            }
        }, 540);
        return () => clearTimeout(fallback);
    }, [isTransitioning, loop, n]);

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;
        setIsTransitioning(false);
        setPrevIdx(null);
        if (loop && idx >= n) {
            setAnim(false);
            setIdx(0);
        }
    };

    const goTo = (i: number) => {
        setPrevIdx(idxRef.current);
        setIsTransitioning(true);
        setAnim(true);
        setIdx(i);
        startAuto(); // qo'lda o'zgartirilganda taymerni qayta boshlash
    };
    const next = () => goTo(idx + 1);
    const prev = () => {
        if (idx <= 0) {
            // animatsiyasiz klon (oxirgi) holatga o'tib, keyin oldingisiga silliq qaytamiz
            setAnim(false);
            setIdx(n);
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    setPrevIdx(n);
                    setIsTransitioning(true);
                    setAnim(true);
                    setIdx(n - 1);
                    startAuto();
                })
            );
        } else {
            goTo(idx - 1);
        }
    };

    const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) {
            videoPreWarmer.triggerHaptic("light");
            dx < 0 ? next() : prev();
        }
        touchX.current = null;
    };

    const handleBannerNavigate = useCallback((href: string) => {
        router.push(href);
    }, [router]);

    if (n === 0) return null;

    const innerStyle: React.CSSProperties = {
        position: "relative",
        overflow: "hidden",
        borderRadius,
        background: "#f3f4f6",
        ...(aspectRatio ? { aspectRatio } : { height: heightPx ? `${heightPx}px` : "100%" }),
    };

    return (
        <div
            ref={rootRef}
            className={bare ? "overflow-hidden h-full" : "mt-8 px-0 md:px-10 overflow-hidden"}
            style={outerPadding ? { padding: outerPadding } : undefined}
        >
            <div style={innerStyle} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                {/* Track */}
                <div
                    className="flex h-full"
                    style={{
                        width: `${slides.length * 100}%`,
                        transform: `translate3d(-${(idx * 100) / slides.length}%, 0, 0)`,
                        transition: anim ? TRANSITION : "none",
                        willChange: isTransitioning ? "transform" : undefined,
                        backfaceVisibility: "hidden",
                    }}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {slides.map((banner, i) => {
                        const html = (language === "uz" ? banner.html_uz : banner.html_ru) || "";
                        const isActiveSlide =
                            canAnimate && (i === idx || (isTransitioning && anim && i === prevIdx));
                        return (
                            <div
                                key={`${banner.id}-${i}`}
                                style={{ width: `${100 / slides.length}%`, height: "100%", position: "relative", overflow: "hidden" }}
                            >
                                <ShadowBannerSlide
                                    html={html}
                                    enabled={isViewportVisible}
                                    isActive={isActiveSlide}
                                    onNavigate={handleBannerNavigate}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Dots (qo'lda boshqaruv) */}
                {loop && (
                    <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 5, pointerEvents: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 20, background: "rgba(15, 20, 16, 0.48)", pointerEvents: "auto" }}>
                            {visible.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        videoPreWarmer.triggerHaptic("light");
                                        goTo(i);
                                    }}
                                    aria-label={`Banner ${i + 1}`}
                                    style={{
                                        height: 5, borderRadius: 3, border: "none", cursor: "pointer", padding: 0,
                                        width: realIdx === i ? 20 : 5,
                                        background: realIdx === i ? "#fff" : "rgba(255,255,255,0.45)",
                                        boxShadow: realIdx === i ? "0 1px 4px rgba(0,0,0,0.25)" : "none",
                                        transition: "width 240ms cubic-bezier(0.32,0.72,0,1), background-color 240ms ease",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
