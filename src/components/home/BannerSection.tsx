"use client";

import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface Banner {
    id: string;
    imageUrl_uz: string;
    imageUrl_ru: string;
    title_uz?: string;
    title_ru?: string;
    tabName_uz?: string;
    tabName_ru?: string;
    order?: number;
}

interface BannerSectionProps {
    banners: Banner[];
    bannerSettings: { desktopHeight: number; borderRadius: number };
    currentBanner: number;
    setCurrentBanner: (index: number) => void;
    language: "uz" | "ru";
}

export const BannerSection = ({ banners, bannerSettings, currentBanner, setCurrentBanner, language }: BannerSectionProps) => {
    const bannerRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (bannerRef.current) {
            const index = Math.round(bannerRef.current.scrollLeft / bannerRef.current.offsetWidth);
            setCurrentBanner(index);
        }
    };

    return (
        <div className="mt-8 px-0 md:px-10 overflow-hidden">
            <div
                className="relative overflow-hidden bg-gray-50 transition-all duration-700 shadow-2xl shadow-black/5"
                style={{
                    height: `${bannerSettings.desktopHeight}px`,
                    borderRadius: `${bannerSettings.borderRadius}px`
                }}
            >
                {banners.length > 0 ? (
                    <>
                        <div 
                            ref={bannerRef} 
                            onScroll={handleScroll} 
                            className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
                        >
                            {banners
                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                .map((banner, index) => {
                                    const title = language === 'uz' ? banner.title_uz : banner.title_ru;
                                    const imageUrl = language === 'uz' ? banner.imageUrl_uz : banner.imageUrl_ru;
                                    const tabName = language === 'uz' ? banner.tabName_uz : banner.tabName_ru;

                                    if (!imageUrl) return null;

                                    return (
                                         <div key={banner.id} className="min-w-full h-full snap-center relative">
                                             <Image 
                                                 src={imageUrl} 
                                                 fill
                                                 className="object-cover" 
                                                 alt={title || ""} 
                                                 priority={index === 0}
                                                 sizes="100vw"
                                             />
                                            {tabName && (
                                                <div className="absolute bottom-6 left-6 bg-white/20 backdrop-blur-xl px-6 py-2 rounded-full border border-white/30 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl">
                                                    {tabName}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                        {banners.length > 1 && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                                {banners.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1 rounded-full transition-all duration-300 ${currentBanner === i ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/40'}`} 
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
                        <div className="w-1/4 h-8 bg-gray-200/50 rounded-full" />
                    </div>
                )}
            </div>
        </div>
    );
};
