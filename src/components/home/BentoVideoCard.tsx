"use client";

import { useState, useRef, useEffect, memo } from "react";
import { Link } from "next-view-transitions";
import { Heart, Volume2, VolumeX, Sparkles, Zap, Clapperboard, ShoppingBag, Plus, Check } from "lucide-react";
import { Product, CartItem } from "@/types";
import { TranslationKeys } from "@/lib/translations";
import { getProductSlug } from "@/lib/slugify";
import { videoPreWarmer } from "@/lib/videoPreWarmer";
import { sanitizeVideoUrl } from "@/lib/video-url";
import { QuickBuySheet } from "@/components/reels/QuickBuySheet";

interface BentoVideoCardProps {
    item: Product;
    language: "uz" | "ru";
    t: TranslationKeys;
    cart: CartItem[];
    wishlist: Product[];
    toggleWishlist: (product: Product) => void;
    addToCart: (product: Product) => void;
}

export const BentoVideoCard = memo(({
    item, language, t, cart, wishlist, toggleWishlist, addToCart
}: BentoVideoCardProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isQuickBuyOpen, setIsQuickBuyOpen] = useState(false);
    const [liked, setLiked] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const lastTap = useRef<number>(0);

    const isWished = wishlist.some(w => w.id === item.id);
    const isInCart = cart.some(c => c.id === item.id);
    const rawVideoUrl = item.videoUrl || (item as any).video_url;
    const videoUrl = sanitizeVideoUrl(rawVideoUrl);
    const productName = item[`name_${language}`] || item.name;
    const productImage = item.imageUrl || item.image || (Array.isArray(item.images) ? item.images[0] : undefined);

    // IntersectionObserver: Faqat ekranda ko'ringandagina o'ynatish (akkumulyator va trafikni asrash)
    useEffect(() => {
        const el = containerRef.current;
        const v = videoRef.current;
        if (!el || !v || !videoUrl) return;

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry.isIntersecting) {
                v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            } else {
                v.pause();
                setIsPlaying(false);
            }
        }, { threshold: 0.5 });

        observer.observe(el);
        return () => observer.disconnect();
    }, [videoUrl]);

    // Double Tap Like
    const handleTap = (e: React.MouseEvent) => {
        const now = Date.now();
        if (now - lastTap.current < 280) {
            e.preventDefault();
            e.stopPropagation();
            videoPreWarmer.triggerHaptic("double");
            toggleWishlist(item);
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        }
        lastTap.current = now;
    };

    if (!videoUrl) return null;

    return (
        <div
            ref={containerRef}
            onClick={handleTap}
            className="col-span-2 row-span-2 relative aspect-[3/4] sm:aspect-[4/5] rounded-[30px] overflow-hidden bg-black shadow-xl group border border-gray-100/10 select-none cursor-pointer"
        >
            {/* Background Autoplaying Video */}
            <video
                ref={videoRef}
                src={videoUrl}
                poster={productImage}
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "translateZ(0)" }}
            />

            {/* Top Gradient */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />

            {/* Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

            {/* Top Badge (Instagram Explore Tag) */}
            <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                <Clapperboard size={12} className="text-[#6335ED]" />
                <span>Explore Reel</span>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        videoPreWarmer.triggerHaptic("light");
                        setIsMuted(!isMuted);
                    }}
                    className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
                >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        videoPreWarmer.triggerHaptic("light");
                        toggleWishlist(item);
                    }}
                    className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
                >
                    <Heart size={14} fill={isWished ? "#ef4444" : "none"} className={isWished ? "text-red-500" : "text-white"} />
                </button>
            </div>

            {/* Double Tap Floating Heart */}
            {showHeart && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <Heart size={80} className="text-red-500 fill-red-500 animate-in zoom-in-50 fade-out duration-700" />
                </div>
            )}

            {/* Bottom Floating Info & Quick Buy Action */}
            <div className="absolute bottom-3.5 left-3.5 right-3.5 z-20 space-y-2">
                <Link
                    href={`/${language}/products/${getProductSlug(item, language)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block"
                >
                    <h3 className="text-white text-xs font-black uppercase tracking-tight line-clamp-1 drop-shadow-md">
                        {productName}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-white text-sm font-black italic drop-shadow-md">
                            {Number(item.price).toLocaleString()} {language === "uz" ? "so'm" : "сум"}
                        </span>
                        {item.oldPrice && item.oldPrice > item.price && (
                            <span className="text-white/60 text-[10px] line-through">
                                {Number(item.oldPrice).toLocaleString()}
                            </span>
                        )}
                    </div>
                </Link>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            videoPreWarmer.triggerHaptic("medium");
                            setIsQuickBuyOpen(true);
                        }}
                        className="flex-1 py-2.5 bg-[#6335ED] hover:bg-[#5225d3] text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-[#6335ED]/40 active:scale-95 transition-all"
                    >
                        <Zap size={13} fill="currentColor" />
                        <span>{language === "uz" ? "Tezkor Xarid" : "Купить"}</span>
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            videoPreWarmer.triggerHaptic("light");
                            addToCart(item);
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all border ${
                            isInCart
                                ? "bg-emerald-500 text-white border-emerald-400"
                                : "bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white hover:text-black"
                        }`}
                    >
                        {isInCart ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                    </button>
                </div>
            </div>

            {/* Quick Buy Bottom Sheet */}
            {isQuickBuyOpen && (
                <QuickBuySheet
                    product={item}
                    onClose={() => setIsQuickBuyOpen(false)}
                    language={language}
                    t={t}
                />
            )}
        </div>
    );
});

BentoVideoCard.displayName = "BentoVideoCard";
