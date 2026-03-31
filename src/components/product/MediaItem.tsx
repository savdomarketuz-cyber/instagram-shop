"use client";

import { useEffect, useRef } from "react";
import { Play } from "lucide-react";

interface MediaItemProps {
    media: {
        type: "video" | "image";
        url: string;
    };
    isActive: boolean;
    isLightbox: boolean;
    onClick?: () => void;
    alt?: string;
}

export const MediaItem = ({ media, isActive, isLightbox, onClick, alt }: MediaItemProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

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
                    className={isLightbox ? "w-full h-full object-cover" : "w-full h-full object-cover"}
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

    return (
        <div
            className={`w-full h-full flex items-center justify-center cursor-pointer relative overflow-hidden ${isLightbox ? 'bg-black' : ''}`}
            onClick={onClick}
        >
            {/* Blurred Background for Lightbox (Optional, but kept for edges if not perfect cover) */}
            {isLightbox && (
                <img
                    src={media.url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-50"
                    draggable={false}
                />
            )}

            <img
                src={media.url}
                alt={alt || "Velari product image"}
                className={isLightbox ? "relative max-w-[95%] max-h-[90%] object-contain animate-in zoom-in-95 duration-500 shadow-2xl rounded-lg" : "w-full h-full object-contain zoom-animation p-4"}
                draggable={false}
            />
        </div>
    );
};
