"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
    // Start as visible to prevent the "flash" of content
    const [isVisible, setIsVisible] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isPWA, setIsPWA] = useState(false);

    useEffect(() => {
        // Rapid PWA check
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || (window.navigator as any).standalone 
            || document.referrer.includes('android-app://');

        if (!isStandalone) {
            // If not PWA, disappear instantly
            setIsVisible(false);
            return;
        }

        setIsPWA(true);

        const timer = setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
                setIsVisible(false);
            }, 800);
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

    // If not PWA and useEffect has run, don't show anything
    if (!isVisible) return null;
    
    // If useEffect hasn't determined PWA status yet, we show a blank blocking screen 
    // to prevent the underlying content from flashing.

    return (
        <div className={`
            fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#f0f0f2] transition-opacity duration-700 ease-in-out
            ${isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}>
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-r from-[#2d6e3e]/10 to-transparent blur-3xl opacity-0 animate-[glowIn_1.4s_ease_forwards_0.3s]" />

            <div className="flex flex-col items-center relative scale-50 md:scale-100 transition-transform">
                {/* Letters Container */}
                <div className="flex items-baseline font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] text-[140px] font-[750] text-[#0d1117] tracking-tight leading-none overflow-hidden">
                    {['V', 'E', 'L', 'A', 'R', 'I'].map((char, i) => (
                        <span 
                            key={i} 
                            className="inline-block translate-y-[100px] opacity-0 animate-[letterRise_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                            style={{ animationDelay: `${0.05 + i * 0.08}s` }}
                        >
                            {char}
                        </span>
                    ))}
                    <span 
                        className="dot inline-block text-[#2d6e3e] text-[100px] relative top-[8px] opacity-0 scale-0 -rotate-180 animate-[dotSpin_0.55s_cubic-bezier(0.34,1.56,0.64,1)_forwards]" 
                        style={{ animationDelay: '0.62s' }}
                    >
                        .
                    </span>
                </div>

                {/* Smile Arc */}
                <div className="mt-3 overflow-hidden">
                    <div className="animate-[revealArc_1s_cubic-bezier(0.16,1,0.3,1)_forwards]" style={{ animationDelay: '0.75s', clipPath: 'inset(0 50% 0 50%)' }}>
                        <svg width="560" height="210" viewBox="0 0 560 210" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M 0 20 Q 280 240 560 20 Q 280 180 0 20 Z"
                                fill="#2d6e3e"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes letterRise {
                    0%   { opacity: 0; transform: translateY(100px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes dotSpin {
                    0%   { opacity: 0; transform: scale(0) rotate(-180deg); }
                    100% { opacity: 1; transform: scale(1) rotate(0deg); }
                }
                @keyframes revealArc {
                    0%   { clip-path: inset(0 50% 0 50%); }
                    100% { clip-path: inset(0 0%  0 0%); }
                }
                @keyframes glowIn {
                    0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
