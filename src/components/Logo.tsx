"use client";

import React from "react";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
    showSmile?: boolean;
}

export default function Logo({ className = "", size = "md", showSmile = false }: LogoProps) {
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

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className={`font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] font-black tracking-tighter leading-none text-[#0F1410] select-none flex items-baseline ${sizeClasses[size]}`}>
                VELARI
                <span className={`text-[#2D6E3E] font-black ${dotSizes[size]}`} style={{ verticalAlign: 'baseline', position: 'relative', top: size === 'xl' ? '8px' : '2px' }}>.</span>
            </div>
            
            {showSmile && (
                <div className={`${size === 'xl' ? 'mt-3' : 'mt-1'}`}>
                    <svg 
                        width={size === 'xl' ? 560 : size === 'lg' ? 160 : size === 'md' ? 100 : 80} 
                        height={size === 'xl' ? 210 : size === 'lg' ? 60 : size === 'md' ? 38 : 30} 
                        viewBox="0 0 560 210" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="opacity-90"
                    >
                        <path
                            d="M 0 20 Q 280 240 560 20 Q 280 180 0 20 Z"
                            fill="#2D6E3E"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
}
