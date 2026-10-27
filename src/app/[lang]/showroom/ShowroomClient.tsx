"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Monitor, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Product } from "@/types";
import { translations } from "@/lib/translations";

// Three.js brauzer xotirasi bilan ishlagani uchun dynamic import (SSR: false)
const ShowroomCanvas = dynamic(
    () => import("@/components/showroom/ShowroomCanvas"),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F5F5F7] text-[#1d1d1f]">
                <Loader2 size={36} className="text-emerald-600 animate-spin mb-4" />
                <span className="text-sm font-semibold tracking-wider text-[#86868b]">
                    Yuklanmoqda...
                </span>
            </div>
        )
    }
);

interface ShowroomClientProps {
    initialProducts: Product[];
    lang: "uz" | "ru";
}

export default function ShowroomClient({ initialProducts, lang }: ShowroomClientProps) {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);
    const t = translations[lang];

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // SSR paytida yoki dastlabki mount'da
    if (isMobile === null) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#F5F5F7]">
                <Loader2 size={36} className="text-emerald-600 animate-spin" />
            </div>
        );
    }

    // Mobil qurilmalar uchun zamonaviy Glassmorphism cheklov ekrani (Apple Store uslubida)
    if (isMobile) {
        return (
            <main className="relative flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#F5F5F7] p-6 text-[#1d1d1f] select-none">
                {/* Orqa fon nozik nurlari */}
                <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]" />
                <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />

                {/* Shisha karta (Glassmorphism) */}
                <div className="relative z-10 mx-auto max-w-sm w-full overflow-hidden rounded-3xl border border-black/8 bg-white/80 p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-300">
                    {/* Yuqori Ikonka */}
                    <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-black/8 bg-white text-emerald-600 shadow-md">
                        <Monitor size={38} strokeWidth={1.8} />
                        <Sparkles size={16} className="absolute -top-1.5 -right-1.5 text-amber-500 animate-pulse" />
                    </div>

                    {/* Sarlavha */}
                    <h1 className="mb-3 text-lg font-black tracking-tight text-[#1d1d1f] sm:text-xl">
                        {t.showroom.mobileRestrictedTitle}
                    </h1>

                    {/* Tavsif */}
                    <p className="mb-8 text-xs font-normal text-[#515154] leading-relaxed">
                        {t.showroom.mobileRestrictedDesc}
                    </p>

                    {/* Bosh sahifaga qaytish tugmasi */}
                    <Link
                        href={`/${lang}`}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all hover:bg-black active:scale-95"
                    >
                        <ArrowLeft size={16} />
                        <span>{t.showroom.backToHome}</span>
                    </Link>
                </div>

                <div className="mt-8 text-center text-[11px] font-semibold tracking-widest uppercase text-[#86868b]">
                    Velari.uz • Apple Store Experience
                </div>
            </main>
        );
    }

    // Desktop foydalanuvchilar uchun to'liq 3D Showroom
    return <ShowroomCanvas initialProducts={initialProducts} lang={lang} />;
}
