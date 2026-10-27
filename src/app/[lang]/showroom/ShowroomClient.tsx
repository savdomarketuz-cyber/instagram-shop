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
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0c10] text-white">
                <Loader2 size={36} className="text-emerald-400 animate-spin mb-4" />
                <span className="text-sm font-semibold tracking-wider text-white/70">
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
            <div className="flex h-screen w-screen items-center justify-center bg-[#0a0c10]">
                <Loader2 size={36} className="text-emerald-400 animate-spin" />
            </div>
        );
    }

    // Mobil qurilmalar uchun zamonaviy Glassmorphism cheklov ekrani
    if (isMobile) {
        return (
            <main className="relative flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#07090e] p-6 text-white select-none">
                {/* Orqa fon neon nurlari */}
                <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-emerald-500/15 blur-[120px]" />
                <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-blue-500/15 blur-[120px]" />

                {/* Shisha karta (Glassmorphism) */}
                <div className="relative z-10 mx-auto max-w-sm w-full overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-300">
                    {/* Yuqori Ikonka */}
                    <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-tr from-white/10 to-white/5 text-emerald-400 shadow-inner">
                        <Monitor size={38} strokeWidth={1.8} />
                        <Sparkles size={16} className="absolute -top-1.5 -right-1.5 text-emerald-300 animate-pulse" />
                    </div>

                    {/* Sarlavha */}
                    <h1 className="mb-3 text-lg font-black tracking-tight text-white sm:text-xl">
                        {t.showroom.mobileRestrictedTitle}
                    </h1>

                    {/* Tavsif */}
                    <p className="mb-8 text-xs font-normal text-white/70 leading-relaxed">
                        {t.showroom.mobileRestrictedDesc}
                    </p>

                    {/* Bosh sahifaga qaytish tugmasi */}
                    <Link
                        href={`/${lang}`}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-xs font-bold uppercase tracking-wider text-black shadow-[0_4px_25px_rgba(255,255,255,0.25)] transition-all hover:bg-neutral-100 active:scale-95"
                    >
                        <ArrowLeft size={16} />
                        <span>{t.showroom.backToHome}</span>
                    </Link>
                </div>

                <div className="mt-8 text-center text-[11px] font-semibold tracking-widest uppercase text-white/30">
                    Velari.uz • Virtual Reality Showroom
                </div>
            </main>
        );
    }

    // Desktop foydalanuvchilar uchun to'liq 3D Showroom
    return <ShowroomCanvas initialProducts={initialProducts} lang={lang} />;
}
