"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, Heart, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { MediaItem } from "./MediaItem";

interface ProductMediaProps {
    allMedia: any[];
    activeImage: number;
    setActiveImage: (index: number) => void;
    isWishlisted: boolean;
    toggleWishlist: (p: any) => void;
    product: any;
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
            const index = Math.round(ref.current.scrollLeft / ref.current.offsetWidth);
            handleMediaSelect(index, ref === lightboxCarouselRef);
        }
    };

    const handleMediaSelect = (index: number, isLightbox: boolean = false) => {
        setActiveImage(index);
        const ref = isLightbox ? lightboxCarouselRef : carouselRef;
        if (ref.current) {
            const width = ref.current.offsetWidth;
            ref.current.scrollTo({
                left: index * width,
                behavior: 'smooth'
            });
        }
    };

    const handleScroll = () => {
        if (carouselRef.current && !isDragging) {
            const index = Math.round(carouselRef.current.scrollLeft / carouselRef.current.offsetWidth);
            setActiveImage(index);
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
            <div className="relative w-full aspect-[3/4] bg-gray-50 overflow-hidden group/media-section">
                <div
                    ref={carouselRef}
                    onScroll={handleScroll}
                    onMouseDown={(e) => onMouseDown(e, carouselRef)}
                    onMouseMove={(e) => onMouseMove(e, carouselRef)}
                    onMouseUp={() => stopDragging(carouselRef)}
                    onMouseLeave={() => stopDragging(carouselRef)}
                    className={`flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    {allMedia.map((media, i) => (
                        <div key={i} className="min-w-full h-full snap-center bg-white flex items-center justify-center relative pointer-events-none">
                            <div className="w-full h-full pointer-events-auto">
                                <MediaItem 
                                    media={media} 
                                    isActive={activeImage === i} 
                                    isLightbox={false} 
                                    onClick={() => !isDragging && setIsLightboxOpen(true)} 
                                    alt={product.name}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5 z-20">
                    {allMedia.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${activeImage === i ? "w-6 bg-black/40" : "w-1 bg-black/10"}`} />
                    ))}
                </div>
                <div className="absolute top-8 left-6 right-6 flex justify-between items-center z-10 pointer-events-none">
                    <button onClick={() => router.back()} className="p-4 bg-white/80 backdrop-blur-xl text-black rounded-[24px] shadow-xl active:scale-95 transition-all border border-white/50 pointer-events-auto">
                        <ChevronLeft size={24} strokeWidth={3} />
                    </button>
                    <button 
                        onClick={() => toggleWishlist({ 
                            id: product.id, 
                            name: product.name, 
                            price: product.price, 
                            oldPrice: product.oldPrice, 
                            imageUrl: product.image, 
                            category: product.category 
                        })} 
                        className="p-4 bg-white/80 backdrop-blur-xl text-black rounded-[24px] shadow-xl active:scale-95 transition-all border border-white/50 pointer-events-auto"
                    >
                        <Heart size={24} fill={isWishlisted ? "#ef4444" : "none"} className={isWishlisted ? "text-red-500" : "text-gray-400"} />
                    </button>
                </div>
            </div>

            {isLightboxOpen && (
                <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <button onClick={() => setIsLightboxOpen(false)} className="absolute top-10 right-10 p-4 bg-white/10 text-white rounded-full backdrop-blur-xl transition-all z-[110] border border-white/10">
                        <X size={24} strokeWidth={3} />
                    </button>
                    <div className="w-full h-full flex items-center justify-center relative">
                        <div ref={lightboxCarouselRef} className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
                            {allMedia.map((media, i) => (
                                <div key={i} className="min-w-full h-full flex items-center justify-center snap-center p-4 select-none">
                                    <div className="relative w-full h-full flex items-center justify-center">
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
