"use client";
import React from 'react';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
            {/* Logo Animation */}
            <div className="relative flex flex-col items-center">
                <div className="flex items-baseline">
                    <span className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter animate-pulse">
                        VELARI
                    </span>
                    <span className="text-5xl md:text-6xl font-black text-green-600 animate-bounce ml-1">
                        .
                    </span>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-8 w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 animate-[loading_1.5s_ease-in-out_infinite]" 
                         style={{ width: '30%' }}></div>
                </div>
            </div>

            {/* Skeleton Content Simulation */}
            <div className="mt-12 w-full max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-20 select-none pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-3">
                        <div className="aspect-[3/4] bg-gray-200 rounded-xl animate-pulse"></div>
                        <div className="h-4 w-3/4 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-4 w-1/2 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); width: 30%; }
                    50% { width: 60%; }
                    100% { transform: translateX(400%); width: 30%; }
                }
            `}</style>
        </div>
    );
}
