"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, Heart, X, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { MediaItem } from "./MediaItem";

import { Product, MediaItemType } from "@/types";

interface ProductMediaProps {
    allMedia: MediaItemType[];
    activeImage: number;
    setActiveImage: (index: number) => void;
    isWishlisted: boolean;
    toggleWishlist: (p: Product) => void;
    product: Product;
}

export const ProductMedia = ({
    allMedia,
    activeImage,
    setActiveImage,
    isWishlisted,
    toggleWishlist,
    product
}: ProductMediaProps) => {
    const router = useRouter();
    const carouselRef = useRef<HTMLDivElement>(null);
    const lightboxCarouselRef = useRef<HTMLDivElement>(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [maxVisibleIndex, setMaxVisibleIndex] = useState(0);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onMouseDown = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement>) => {
        if (!ref.current) return;
        setIsDragging(true);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
        ref.current.style.scrollBehavior = 'auto';
    };

    const onMouseMove = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement>) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 2;
        ref.current.scrollLeft = scrollLeft - walk;
    };

    const stopDragging = (ref: React.RefObject<HTMLDivElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        if (ref.current) {
            ref.current.style.scrollBehavior = 'smooth';
            // Custom snap logic for carousel with next items preview
            const width = ref.current.offsetWidth * 0.85; 
            const index = Math.round(ref.current.scrollLeft / width);
            handleMediaSelect(Math.min(index, allMedia.length - 1));
        }
    };

    const handleMediaSelect = (index: number) => {
        setActiveImage(index);
        if (carouselRef.current) {
            const width = carouselRef.current.offsetWidth * 0.85; // match item width + gap
            carouselRef.current.scrollTo({
                left: index * width,
                behavior: 'smooth'
            });
        }
    };

    const handleScroll = () => {
        if (carouselRef.current && !isDragging) {
            const width = carouselRef.current.offsetWidth * 0.85;
            const index = Math.round(carouselRef.current.scrollLeft / width);
            if (index !== activeImage && index < allMedia.length) {
                setActiveImage(index);
            }
        }
    };

    useEffect(() => {
        if (isLightboxOpen && lightboxCarouselRef.current) {
            lightboxCarouselRef.current.scrollTo({
                left: activeImage * lightboxCarouselRef.current.offsetWidth,
                behavior: 'instant' as ScrollBehavior
            });
        }
    }, [isLightboxOpen, activeImage]);

    return (
        <>
            <div className="relative w-full bg-white pt-2 pb-6 overflow-hidden group/media-section">
                {/* Horizontal Carousel with Next Preview (Social Style) */}
                <div
                    ref={carouselRef}
                    onScroll={handleScroll}
                    onMouseDown={(e) => onMouseDown(e, carouselRef)}
                    onMouseMove={(e) => onMouseMove(e, carouselRef)}
                    onMouseUp={() => stopDragging(carouselRef)}
                    onMouseLeave={() => stopDragging(carouselRef)}
                    className={`flex w-full h-full overflow-x-auto no-scrollbar px-5 gap-3 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {allMedia.map((media, i) => (
                        <div 
                            key={i} 
                            style={{ scrollSnapAlign: 'start' }}
                            className="min-w-[85vw] aspect-[3/4] rounded-[28px] overflow-hidden bg-gray-50 flex items-center justify-center relative shadow-sm border border-gray-100"
                        >
                            <div className="w-full h-full pointer-events-auto">
                                {(i <= maxVisibleIndex) ? (
                                    <MediaItem 
                                        media={{
                                            ...media,
                                            lowResUrl: product.image_metadata?.[media.url]?.lowResUrl
                                        }} 
                                        isActive={activeImage === i} 
                                        isLightbox={false} 
                                        onClick={() => !isDragging && setIsLightboxOpen(true)} 
                                        alt={product.name}
                                        priority={i === 0}
                                        onLoadComplete={() => setMaxVisibleIndex(prev => Math.max(prev, i + 1))}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-50 flex items-center justify-center animate-pulse">
                                        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-400 rounded-full animate-spin opacity-20" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* Extra space at the end */}
                    <div className="min-w-[10vw]" />
                </div>
                
                {/* Dots / Pagination */}
                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                    {allMedia.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${activeImage === i ? "w-6 bg-black/40" : "w-1 bg-black/10"}`} />
                    ))}
                </div>

                {/* Floating Top Controls */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-30 pointer-events-none">
                    {/* Left Group */}
                    <div className="flex flex-col gap-2">
                        <button onClick={() => router.back()} className="p-3 bg-white/40 backdrop-blur-xl text-black rounded-full shadow-lg active:scale-90 transition-all border border-white/50 pointer-events-auto">
                            <ChevronLeft size={20} strokeWidth={3} />
                        </button>
                        <button onClick={() => router.push('/?focus=true')} className="p-3 bg-white/40 backdrop-blur-xl text-black rounded-full shadow-lg active:scale-90 transition-all border border-white/50 pointer-events-auto">
                            <Search size={20} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Right Group */}
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={async () => {
                                try {
                                    await navigator.share({
                                        title: product.name,
                                        text: product.description,
                                        url: window.location.href,
                                    });
                                } catch (err) {
                                    console.warn("Sharing failed", err);
                                }
                            }} 
                            className="p-3 bg-white/40 backdrop-blur-xl text-black rounded-full shadow-lg active:scale-90 transition-all border border-white/50 pointer-events-auto"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </button>
                        <button 
                            onClick={() => toggleWishlist(product)} 
                            className="p-3 bg-white/40 backdrop-blur-xl text-black rounded-full shadow-lg active:scale-90 transition-all border border-white/50 pointer-events-auto"
                        >
                            <Heart size={20} fill={isWishlisted ? "#ef4444" : "none"} className={isWishlisted ? "text-red-500" : "text-gray-400"} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Lightbox remains standard full screen */}
            {isLightboxOpen && (
                <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <button onClick={() => setIsLightboxOpen(false)} className="absolute top-10 right-10 p-4 bg-white/10 text-white rounded-full backdrop-blur-xl transition-all z-[110] border border-white/10">
                        <X size={24} strokeWidth={3} />
                    </button>
                    <div className="w-full h-full flex items-center justify-center relative">
                        <div ref={lightboxCarouselRef} className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
                            {allMedia.map((media, i) => (
                                <div key={i} className="min-w-full h-full flex items-center justify-center snap-center select-none">
                                    <div className="relative w-full h-full">
                                        <MediaItem media={media} isActive={activeImage === i} isLightbox={true} alt={product.name} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
