"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Banner } from "@/types";

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

const TRANSITION = "transform 650ms cubic-bezier(0.22,1,0.36,1)";

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
    // Faqat HTML kontenti bor bannerlar
    const visible = banners
        .filter((b) => (language === "uz" ? b.html_uz : b.html_ru))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const n = visible.length;
    const loop = n > 1;
    // Cheksiz loop uchun oxiriga birinchi slaydning nusxasi qo'shiladi
    const slides = loop ? [...visible, visible[0]] : visible;

    const [idx, setIdx] = useState(0);
    const [anim, setAnim] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const touchX = useRef<number | null>(null);

    const realIdx = ((idx % n) + n) % n; // dot/holat uchun

    const startAuto = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!loop || !intervalMs) return;
        timerRef.current = setInterval(() => {
            setAnim(true);
            setIdx((i) => i + 1);
        }, intervalMs);
    }, [loop, intervalMs]);

    useEffect(() => {
        startAuto();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [startAuto]);

    // Klon slaydga yetganda — animatsiyasiz boshiga qaytamiz (seamless loop)
    useEffect(() => {
        if (!anim) {
            const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
            return () => cancelAnimationFrame(r);
        }
    }, [anim]);

    const handleTransitionEnd = () => {
        if (loop && idx >= n) {
            setAnim(false);
            setIdx(0);
        }
    };

    const goTo = (i: number) => {
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
            requestAnimationFrame(() => requestAnimationFrame(() => { setAnim(true); setIdx(n - 1); startAuto(); }));
        } else {
            goTo(idx - 1);
        }
    };

    const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
        touchX.current = null;
    };

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
            className={bare ? "overflow-hidden h-full" : "mt-8 px-0 md:px-10 overflow-hidden"}
            style={outerPadding ? { padding: outerPadding } : undefined}
        >
            <div style={innerStyle} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                {/* Track */}
                <div
                    className="flex h-full"
                    style={{
                        width: `${slides.length * 100}%`,
                        transform: `translateX(-${(idx * 100) / slides.length}%)`,
                        transition: anim ? TRANSITION : "none",
                    }}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {slides.map((banner, i) => {
                        const html = language === "uz" ? banner.html_uz : banner.html_ru;
                        // Banner HTML'ini to'liq hujjatga o'raymiz: html/body to'liq balandlikni egallasin.
                        // Aks holda `height:100%` yoki `container-type:size` ishlatadigan bannerlar
                        // iframe ichida nol balandlikka tushib, ko'rinmay qolardi.
                        // <base target="_top"> — banner ichidagi havolalar iframe emas, BUTUN sahifada ochilsin.
                        const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_top"><style>html,body{height:100%;width:100%;margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>${html || ""}</body></html>`;
                        return (
                            <div
                                key={`${banner.id}-${i}`}
                                style={{ width: `${100 / slides.length}%`, height: "100%", position: "relative", overflow: "hidden" }}
                            >
                                {/* Banner HTML'i alohida iframe ichida — o'zining <style>/body qoidalari
                                    sahifaga oqib o'tmasligi uchun (aks holda body'ga padding qo'shilib
                                    sayt chetlaridan siqilib qolardi). pointer-events:auto — banner
                                    ichidagi havolalar bosiladi (base target=_top bilan butun sahifada
                                    ochiladi). Bir nechta banner orasida o'tish — nuqtalar (dots) va
                                    avto-almashinish orqali. */}
                                <iframe
                                    title={`banner-${banner.id}`}
                                    srcDoc={doc}
                                    scrolling="no"
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        height: "100%",
                                        border: "none",
                                        pointerEvents: "auto",
                                        background: "transparent",
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Dots (qo'lda boshqaruv) */}
                {loop && (
                    <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 5 }}>
                        {visible.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                aria-label={`Banner ${i + 1}`}
                                style={{
                                    height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0,
                                    width: realIdx === i ? 22 : 6,
                                    background: realIdx === i ? "#fff" : "rgba(255,255,255,0.5)",
                                    boxShadow: realIdx === i ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
                                    transition: "all 300ms cubic-bezier(0.22,1,0.36,1)",
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
