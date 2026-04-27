"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import Image from "next/image";

interface MediaItemProps {
    media: {
        type: "video" | "image";
        url: string;
        lowResUrl?: string; // High-speed thumbnail
    };
    isActive: boolean;
    isLightbox: boolean;
    onClick?: () => void;
    alt?: string;
    priority?: boolean;
    blurDataURL?: string;
    onLoadComplete?: () => void;
}

export const MediaItem = ({ media, isActive, isLightbox, onClick, alt, priority = false, blurDataURL, onLoadComplete }: MediaItemProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (media.type === 'video' && videoRef.current) {
            if (isActive) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isActive, media.type]);

    if (media.type === 'video') {
        return (
            <div
                className={`w-full h-full relative flex items-center justify-center cursor-pointer overflow-hidden ${isLightbox ? 'bg-black' : ''}`}
                onClick={onClick}
            >
                {/* Blurred Background for Lightbox */}
                {isLightbox && (
                    <video
                        src={media.url}
                        className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-40"
                        muted
                        loop
                        playsInline
                    />
                )}
                
                <video
                    ref={videoRef}
                    src={media.url}
                    className="w-full h-full object-cover"
                    muted={!isLightbox}
                    loop
                    playsInline
                />
                {!isLightbox && !isActive && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity">
                        <div className="w-20 h-20 bg-white/30 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30">
                            <Play size={32} className="text-white fill-white ml-1" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Lightbox uses native img for pinch-zoom and full resolution
    if (isLightbox) {
        return (
            <div
                className="w-full h-full flex items-center justify-center cursor-pointer relative overflow-hidden bg-black"
                onClick={onClick}
            >
                <img
                    src={media.url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-50"
                    draggable={false}
                />
                <img
                    src={media.url}
                    alt={alt || "Velari product image"}
                    className="relative max-w-[95%] max-h-[90%] object-contain animate-in zoom-in-95 duration-500 shadow-2xl rounded-lg"
                    draggable={false}
                />
            </div>
        );
    }

    // Normal carousel: Two-layer loading for maximum perception speed
    return (
        <div
            className="w-full h-full flex items-center justify-center cursor-pointer relative overflow-hidden bg-gray-50"
            onClick={onClick}
        >
            {/* 1. Low-Res Background (Instant) */}
            {media.lowResUrl && (
                <Image
                    src={media.lowResUrl}
                    alt=""
                    fill
                    className={`object-cover blur-[5px] scale-110 transition-opacity duration-1000 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
                    sizes="10vw"
                    priority={priority}
                />
            )}

            {/* 2. High-Res Foreground (Gradual) */}
            <Image
                src={media.url}
                alt={alt || "Velari mahsulotlari - Sifatli elektronika va maishiy texnika"}
                fill
                className={`object-cover transition-all duration-700 ease-out ${isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'}`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={priority}
                
                fetchPriority={priority ? "high" : "auto"}
                onLoad={() => {
                    setIsLoaded(true);
                    if (onLoadComplete) onLoadComplete();
                }}
                itemProp="image"
                referrerPolicy="no-referrer"
            />
        </div>
    );
};


