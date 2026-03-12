"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Show splash for 2 seconds then fade out
        const timer = setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
                setIsVisible(false);
            }, 800); // Match this with the duration of the fade-out animation
        }, 2200);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div className={`
            fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white transition-opacity duration-700 ease-in-out
            ${isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}>
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gray-50 rounded-full blur-[120px] opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-50 rounded-full blur-[120px] opacity-50" />
            </div>

            <div className="relative flex flex-col items-center gap-10 animate-in fade-in zoom-in duration-1000 ease-out">
                {/* Logo Container with Pulse Animation */}
                <div className="relative">
                    {/* Pulsing Glow */}
                    <div className="absolute inset-0 bg-black/5 rounded-full blur-2xl animate-pulse scale-150" />
                    
                    <div className="relative w-32 h-32 bg-black text-white rounded-[40px] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden">
                        {/* Animated Shining Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        <span className="text-6xl font-black italic tracking-tighter selec-none">V</span>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase animate-in slide-in-from-bottom duration-700 delay-300">
                        VELARI
                    </h1>
                    <div className="h-1 w-12 bg-black rounded-full animate-in zoom-in duration-700 delay-500" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-in fade-in duration-1000 delay-700">
                        Market
                    </p>
                </div>
            </div>

            {/* Bottom Slogan */}
            <div className="absolute bottom-16 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] animate-pulse">
                Premium Electronics Store
            </div>

            <style jsx global>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
}
