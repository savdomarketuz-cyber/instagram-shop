"use client";

import { useRef } from "react";
import type { Banner } from "@/types";

interface BannerSectionProps {
    banners: Banner[];
    bannerSettings: { desktopHeight: number; borderRadius: number };
    currentBanner: number;
    setCurrentBanner: (index: number) => void;
    language: "uz" | "ru";
    /** bare=true bo'lsa tashqi margin/padding (mt-8 px-10) berilmaydi — grid ustuni ichida ishlatish uchun */
    bare?: boolean;
}

export const BannerSection = ({ banners, bannerSettings, currentBanner, setCurrentBanner, language, bare = false }: BannerSectionProps) => {
    const bannerRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (bannerRef.current) {
            const index = Math.round(bannerRef.current.scrollLeft / bannerRef.current.offsetWidth);
            setCurrentBanner(index);
        }
    };

    // Faqat HTML kontenti bor bannerlarni ko'rsatamiz
    const visible = banners
        .filter(b => (language === "uz" ? b.html_uz : b.html_ru))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (visible.length === 0) return null;

    return (
        <div className={bare ? "overflow-hidden h-full" : "mt-8 px-0 md:px-10 overflow-hidden"}>
            <div
                className="relative overflow-hidden bg-gray-50 transition-all duration-700 shadow-2xl shadow-black/5"
                style={{
                    height: `${bannerSettings.desktopHeight}px`,
                    borderRadius: `${bannerSettings.borderRadius}px`
                }}
            >
                <div
                    ref={bannerRef}
                    onScroll={handleScroll}
                    className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
                >
                    {visible.map((banner) => {
                        const html = language === "uz" ? banner.html_uz : banner.html_ru;
                        return (
                            <div
                                key={banner.id}
                                className="min-w-full h-full snap-center relative overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: html || "" }}
                            />
                        );
                    })}
                </div>
                {visible.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                        {visible.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 rounded-full transition-all duration-300 ${currentBanner === i ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/40'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
