"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, MessageSquare, Share2, Sparkles, Volume2, VolumeX, Play, Loader2, Download, Zap } from "lucide-react";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { videoPreWarmer } from "@/lib/videoPreWarmer";
import { QuickBuySheet } from "@/components/reels/QuickBuySheet";

interface SingleReelProps {
    reel: any;
    isActive: boolean;
    isNearby?: boolean;
    isMuted: boolean;
    toggleMute: () => void;
    onCommentOpen: (productId: string) => void;
    language: "uz" | "ru";
    t: any;
}

export const SingleReel = ({
    reel, isActive, isNearby, isMuted, toggleMute, onCommentOpen, language, t
}: SingleReelProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const { user, showToast, cart } = useStore();
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);

    // Instagram In-Reel Shopping & Gesture states
    const [isQuickBuyOpen, setIsQuickBuyOpen] = useState(false);
    const [flyingHeart, setFlyingHeart] = useState<{ x: number; y: number } | null>(null);
    const [soundPill, setSoundPill] = useState<boolean | null>(null);

    const touchStartPos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
    const lastTapTime = useRef<number>(0);
    const tapTimeout = useRef<NodeJS.Timeout | null>(null);

    // Active bo'lganda to'xtovsiz, silliq o'ynash
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        if (isActive && !isQuickBuyOpen) {
            v.muted = isMuted;
            const playPromise = v.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                        // Agar brauzer ovoz tufayli bloklasa, darhol ovozsiz rejimda o'ynaymiz (hech qachon qotib qolmaydi)
                        v.muted = true;
                        v.play()
                            .then(() => setIsPlaying(true))
                            .catch(() => setIsPlaying(false));
                    });
            }
        } else {
            v.pause();
            v.currentTime = 0;
            setIsPlaying(false);
        }
    }, [isActive, isQuickBuyOpen]);

    // Ovoz o'zgarganda videoga qo'llash
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // Progress bar: requestAnimationFrame bilan silliq yuradi
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !isActive) return;

        const tick = () => {
            if (v.duration > 0 && progressRef.current) {
                const p = (v.currentTime / v.duration) * 100;
                progressRef.current.style.width = `${p}%`;
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isActive]);

    const handleLike = useCallback(async (forcedLike?: boolean) => {
        if (!user) {
            showToast(language === 'uz' ? "Yoqtirish uchun tizimga kiring" : "Войдите, чтобы поставить лайк", 'info');
            return;
        }
        const newLiked = forcedLike !== undefined ? forcedLike : !liked;
        if (newLiked === liked && forcedLike !== undefined) return;

        const diff = newLiked ? 1 : -1;
        setLiked(newLiked);
        setLikesCount((prev: number) => Math.max(0, prev + diff));
        videoPreWarmer.triggerHaptic(newLiked ? "double" : "light");

        try {
            await supabase.rpc('increment_reel_likes', { reel_id: reel.id, diff: diff });
        } catch (error) {
            console.error(error);
        }
    }, [user, liked, language, reel.id, showToast]);

    // Touch boshlanishi
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    };

    // Touch tugashi: Skroll (swipe) bilan chertish (tap)ni aniq ajratamiz
    const handleTouchEnd = (e: React.TouchEvent) => {
        const touch = e.changedTouches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        const dt = Date.now() - touchStartPos.current.time;

        // Agar barmoq 15px dan ko'p siljigan bo'lsa yoki ushlab turilgan bo'lsa, bu skroll!
        if (dx > 15 || dy > 15 || dt > 500) return;

        processTap(touch.clientX, touch.clientY);
    };

    // Sichqoncha bilan bosish (Desktop uchun)
    const handleClick = (e: React.MouseEvent) => {
        processTap(e.clientX, e.clientY);
    };

    const processTap = (clientX: number, clientY: number) => {
        const now = Date.now();
        const tapInterval = now - lastTapTime.current;

        if (tapInterval < 280) {
            // Double Tap: Like + Flying Heart
            if (tapTimeout.current) clearTimeout(tapTimeout.current);
            const rect = videoRef.current?.getBoundingClientRect();
            const x = rect ? clientX - rect.left : clientX;
            const y = rect ? clientY - rect.top : clientY;

            setFlyingHeart({ x, y });
            handleLike(true);
            setTimeout(() => setFlyingHeart(null), 850);
        } else {
            // Single Tap: Instagram kabi ovozni yoqish/o'chirish
            tapTimeout.current = setTimeout(() => {
                videoPreWarmer.triggerHaptic("light");
                const nextMuted = !isMuted;
                toggleMute();
                setSoundPill(nextMuted);
                setTimeout(() => setSoundPill(null), 800);
            }, 280);
        }
        lastTapTime.current = now;
    };

    const handleShare = () => {
        videoPreWarmer.triggerHaptic("light");
        if (navigator.share) {
            navigator.share({
                title: reel[`name_${language}`] || reel.name,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            showToast(language === "uz" ? "Havola nusxalandi!" : "Ссылка скопирована!", "info");
        }
    };

    const handleDownload = async () => {
        if (!reel.videoUrl) return;
        videoPreWarmer.triggerHaptic("medium");
        try {
            showToast(language === 'uz' ? "Yuklab olinmoqda..." : "Скачивание...", 'info');
            const response = await fetch(reel.videoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reel[`name_${language}`] || reel.name || 'reel-video'}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            window.open(reel.videoUrl, '_blank');
        }
    };

    // Mahsulot obyekti (Quick-Buy sheet uchun)
    const reelProduct = {
        id: reel.productId || reel.id,
        name: reel.name,
        name_uz: reel.name_uz || reel.name,
        name_ru: reel.name_ru || reel.name,
        price: reel.price,
        image: reel.image,
        imageUrl: reel.image,
        category: reel.category || "Velari",
        stockDetails: reel.stockDetails || null,
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex flex-col items-center justify-center select-none">
            {/* Main Video Viewport */}
            <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={handleClick}
                className={`relative w-full h-full bg-black flex items-center justify-center transition-all duration-300 ${
                    isQuickBuyOpen ? "scale-[0.94] brightness-50 blur-[2px] rounded-3xl" : "scale-100"
                }`}
            >
                {/* Direct Hardware Video Element */}
                <video
                    ref={videoRef}
                    src={reel.videoUrl || ""}
                    className="w-full h-full object-cover pointer-events-none cursor-pointer"
                    loop
                    playsInline
                    webkit-playsinline="true"
                    muted={isMuted}
                    poster={reel.image}
                    preload={isActive ? "auto" : (isNearby ? "metadata" : "none")}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => {
                        setIsBuffering(false);
                        setIsPlaying(true);
                    }}
                    onCanPlay={() => setIsBuffering(false)}
                    onPause={() => setIsPlaying(false)}
                />

                {/* Instagram Double-Tap Flying Heart */}
                {flyingHeart && (
                    <div
                        className="absolute pointer-events-none z-50 flex items-center justify-center"
                        style={{
                            left: `${flyingHeart.x}px`,
                            top: `${flyingHeart.y}px`,
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <Heart
                            size={95}
                            className="text-red-500 fill-red-500 drop-shadow-[0_10px_25px_rgba(255,0,0,0.7)] animate-in zoom-in-50 fade-out-0 duration-700"
                        />
                    </div>
                )}

                {/* Instagram Center Sound Indicator (tap toggled) */}
                {soundPill !== null && (
                    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                        <div className="w-16 h-16 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 animate-in zoom-in-75 fade-out-0 duration-500 shadow-2xl">
                            {soundPill ? <VolumeX size={30} className="text-white" /> : <Volume2 size={30} className="text-white" />}
                        </div>
                    </div>
                )}
            </div>

            {/* Content Top Overlay */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

            {/* Progress Bar (rAF) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-50">
                <div ref={progressRef} className="h-full bg-white transition-none" style={{ width: '0%' }} />
            </div>

            {/* Buffering Indicator */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/20 pointer-events-none">
                    <Loader2 size={44} className="text-white animate-spin opacity-80" />
                </div>
            )}

            {/* Right Side Action Bar (Instagram Native Design) */}
            <div className="absolute bottom-24 right-3.5 flex flex-col items-center gap-5 z-40">
                {/* Mute Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        videoPreWarmer.triggerHaptic("light");
                        toggleMute();
                    }}
                    className="w-11 h-11 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/15 active:scale-90 transition-transform text-white shadow-lg"
                >
                    {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>

                {/* Like Button */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleLike();
                        }}
                        className={`w-11 h-11 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/15 active:scale-90 transition-transform shadow-lg ${
                            liked ? 'text-red-500 bg-red-500/20 border-red-500/30' : 'text-white'
                        }`}
                    >
                        <Heart size={23} fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 0 : 2.2} />
                    </button>
                    <span className="text-[10px] font-black text-white drop-shadow-md">{likesCount}</span>
                </div>

                {/* Comment Button */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            videoPreWarmer.triggerHaptic("light");
                            onCommentOpen(reel.productId || reel.id);
                        }}
                        className="w-11 h-11 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/15 active:scale-90 transition-transform text-white shadow-lg"
                    >
                        <MessageSquare size={21} strokeWidth={2.2} />
                    </button>
                    <span className="text-[10px] font-black text-white drop-shadow-md">{reel.commentCount || 0}</span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleShare();
                        }}
                        className="w-11 h-11 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/15 active:scale-90 transition-transform text-white shadow-lg"
                    >
                        <Share2 size={21} strokeWidth={2.2} />
                    </button>
                    <span className="text-[9px] font-black uppercase text-white/90 drop-shadow-md">{t.reels?.share || "SHARE"}</span>
                </div>

                {/* Download Button */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                        }}
                        className="w-11 h-11 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/15 active:scale-90 transition-transform text-white shadow-lg"
                        title={language === 'uz' ? "Yuklab olish" : "Скачать"}
                    >
                        <Download size={21} strokeWidth={2.2} />
                    </button>
                    <span className="text-[9px] font-black uppercase text-white/90 drop-shadow-md">{t.reels?.save || "SAVE"}</span>
                </div>
            </div>

            {/* Bottom Product Card & Quick Buy Button (Instagram Shopping) */}
            <div className="absolute bottom-5 left-3.5 right-18 z-40 space-y-3">
                {/* Floating Interactive Product Card */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        videoPreWarmer.triggerHaptic("medium");
                        setIsQuickBuyOpen(true);
                    }}
                    className="inline-flex items-center gap-3 bg-white/95 backdrop-blur-xl p-2.5 pr-4 rounded-[22px] border border-white/80 shadow-[0_12px_35px_rgba(0,0,0,0.35)] active:scale-95 transition-all cursor-pointer group"
                >
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                        <img src={reel.image} className="w-full h-full object-cover" alt={reel.name} loading="lazy" />
                        <div className="absolute top-0 right-0 p-1 bg-[#6335ED] rounded-bl-lg shrink-0">
                            <Sparkles size={8} className="text-white fill-white" />
                        </div>
                    </div>

                    <div className="flex flex-col min-w-0 pr-1">
                        <h4 className="text-[11px] font-black text-black uppercase tracking-tight line-clamp-1 max-w-[130px]">
                            {reel[`name_${language}`] || reel.name}
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-black italic text-[#6335ED]">
                                {reel.price?.toLocaleString()} {language === 'uz' ? "so'm" : "сум"}
                            </span>
                        </div>
                    </div>

                    <div className="h-7 w-[1px] bg-gray-200 shrink-0" />

                    {/* Quick Buy CTA Pill */}
                    <button
                        type="button"
                        className="px-3 py-2 bg-[#6335ED] text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1 active:scale-90 transition-transform"
                    >
                        <Zap size={12} fill="currentColor" />
                        <span>{language === "uz" ? "Xarid" : "Купить"}</span>
                    </button>
                </div>

                {/* Reel Meta / Sound / Category */}
                <div className="flex items-center gap-2 max-w-[85%]">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Volume2 size={11} className="text-white" />
                    </div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md truncate">
                        {language === 'uz' 
                            ? `Original ovoz • ${reel.category || "Velari"} to'plami` 
                            : `Оригинальный звук • Коллекция ${reel.category || "Velari"}`}
                    </p>
                </div>
            </div>

            {/* Bottom Gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

            {/* Quick Buy Bottom Sheet Modal */}
            {isQuickBuyOpen && (
                <QuickBuySheet
                    product={reelProduct}
                    onClose={() => setIsQuickBuyOpen(false)}
                    language={language}
                    t={t}
                />
            )}
        </div>
    );
};
