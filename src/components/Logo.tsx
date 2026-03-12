"use client";

import React from "react";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
    showSmile?: boolean;
}

export default function Logo({ className = "", size = "md", showSmile = true }: LogoProps) {
    const sizeClasses = {
        sm: "text-xl",
        md: "text-2xl",
        lg: "text-4xl",
        xl: "text-[140px]"
    };

    const dotSizes = {
        sm: "text-base",
        md: "text-xl",
        lg: "text-3xl",
        xl: "text-[100px]"
    };

    // Responsive widths for the smile arc
    const smileWidths = {
        sm: 80,
        md: 100,
        lg: 160,
        xl: 560
    };

    const smileHeights = {
        sm: 30,
        md: 38,
        lg: 60,
        xl: 210
    };

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className={`font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] font-bold tracking-tighter leading-none text-black select-none flex items-baseline ${sizeClasses[size]}`}>
                VELARI
                <span className={`text-[#2d6e3e] font-bold ${dotSizes[size]}`} style={{ verticalAlign: 'baseline', position: 'relative', top: size === 'xl' ? '8px' : '2px' }}>.</span>
            </div>
            
            {showSmile && (
                <div className={`${size === 'xl' ? 'mt-3' : 'mt-1'}`}>
                    <svg 
                        width={smileWidths[size]} 
                        height={smileHeights[size]} 
                        viewBox="0 0 560 210" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="opacity-90"
                    >
                        <path
                            d="M 0 20 Q 280 240 560 20 Q 280 180 0 20 Z"
                            fill="#2d6e3e"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
}
