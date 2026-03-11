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
                className={`w-full h-full relative flex items-center justify-center cursor-pointer ${isLightbox ? 'bg-black' : ''}`}
                onClick={onClick}
            >
                <video
                    ref={videoRef}
                    src={media.url}
                    className={isLightbox ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"}
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
            className={`w-full h-full flex items-center justify-center cursor-pointer ${isLightbox ? 'bg-black' : ''}`}
            onClick={onClick}
        >
            <img
                src={media.url}
                alt={alt || "Velari product image"}
                className={isLightbox ? "max-w-full max-h-full object-contain animate-in zoom-in duration-500" : "w-full h-full object-cover zoom-animation"}
                draggable={false}
            />
        </div>
    );
};
