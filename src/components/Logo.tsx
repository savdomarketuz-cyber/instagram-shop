"use client";

import React from "react";

interface LogoProps {
    className?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    dark?: boolean;
    showSmile?: boolean;
    showSubtitle?: boolean;
    forceTheme?: "shop" | "library";
}

export default function Logo({
    className = "",
    size = "md",
    dark = false,
    showSubtitle = true,
    forceTheme
}: LogoProps) {
    const isLibrary = forceTheme 
        ? forceTheme === "library" 
        : (process.env.NEXT_PUBLIC_APP_THEME === "library" || 
           (typeof window !== "undefined" && (window.location.host.includes("book") || window.location.host.includes("kutubxona"))));

    if (isLibrary) {
        const textSizes = {
            xs: "text-base",
            sm: "text-lg",
            md: "text-xl",
            lg: "text-3xl",
            xl: "text-6xl"
        };

        const iconSizes = {
            xs: 18,
            sm: 22,
            md: 26,
            lg: 36,
            xl: 64
        };

        const badgeSizes = {
            xs: "text-[7px] px-1 py-0.5",
            sm: "text-[8px] px-1.5 py-0.5",
            md: "text-[9px] px-1.5 py-0.5",
            lg: "text-[11px] px-2 py-0.5",
            xl: "text-[16px] px-3 py-1"
        };

        const textColor = dark ? "text-white" : "text-[#0F172A]";

        return (
            <div className={`flex items-center gap-2 select-none group ${className}`}>
                {/* Illuminated Book Emblem */}
                <div
                    className="relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                    style={{ width: iconSizes[size], height: iconSizes[size] }}
                >
                    <svg
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full drop-shadow-sm"
                    >
                        <defs>
                            <linearGradient id="emblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#047857" />
                            </linearGradient>
                            <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FDE68A" />
                                <stop offset="100%" stopColor="#F59E0B" />
                            </linearGradient>
                        </defs>

                        {/* Left Page */}
                        <path
                            d="M19 28 C 13 24.5, 6 26.5, 5 26.5 L 5 11 C 6 11, 13 9, 19 12.5 Z"
                            fill={dark ? "#FFFFFF" : "#166534"}
                        />
                        {/* Right Page */}
                        <path
                            d="M21 28 C 27 24.5, 34 26.5, 35 26.5 L 35 11 C 34 11, 27 9, 21 12.5 Z"
                            fill="url(#emblemGrad)"
                        />
                        {/* Spine / Bookmark */}
                        <path
                            d="M19 11.5 L 21 11.5 L 21 32 L 20 30.5 L 19 32 Z"
                            fill="url(#goldRibbon)"
                        />
                        {/* Wisdom Spark Star */}
                        <polygon
                            points="20,2 21,5 24,6 21,7 20,10 19,7 16,6 19,5"
                            fill="#F59E0B"
                        />
                        <circle cx="20" cy="6" r="0.8" fill="#FFFFFF" />
                    </svg>
                </div>

                {/* Typography & Badge */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 leading-none">
                        <span className={`font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] font-black tracking-tight ${textColor} ${textSizes[size]}`}>
                            VELARI
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        {showSubtitle && (
                            <span
                                className={`rounded font-black uppercase tracking-[0.18em] ${badgeSizes[size]} ${
                                    dark
                                        ? "bg-[#166534] text-[#86EFAC] border border-[#22C55E]/30"
                                        : "bg-[#EAF3EC] text-[#166534]"
                                }`}
                            >
                                KUTUBXONA
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Default: Velari Store Logo
    const sizeClasses = {
        xs: "text-lg",
        sm: "text-xl",
        md: "text-2xl",
        lg: "text-4xl",
        xl: "text-[140px]"
    };

    const dotSizes = {
        xs: "text-sm",
        sm: "text-base",
        md: "text-xl",
        lg: "text-3xl",
        xl: "text-[100px]"
    };

    const textColor = dark ? "text-white" : "text-[#0F1410]";

    return (
        <div className={`flex items-baseline select-none ${className}`}>
            <span className={`font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] font-black tracking-tighter leading-none ${textColor} flex items-baseline`}>
                <span className={sizeClasses[size]}>VELARI</span>
                <span className={`text-[#2D6E3E] font-black ${dotSizes[size]}`} style={{ verticalAlign: 'baseline', position: 'relative', top: size === 'xl' ? '8px' : '2px' }}>.</span>
            </span>
        </div>
    );
}
