"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, MessageSquare, Share2, Volume2, VolumeX, Play, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { videoPreWarmer } from "@/lib/videoPreWarmer";
import { sanitizeVideoUrl } from "@/lib/video-url";
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
    const { user, showToast } = useStore();
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Instagram In-Reel Shopping & Gesture states
    const [isQuickBuyOpen, setIsQuickBuyOpen] = useState(false);
    const [flyingHeart, setFlyingHeart] = useState<{ x: number; y: number } | null>(null);
    const [soundPill, setSoundPill] = useState<boolean | null>(null);

    const lastTapRef = useRef<number>(0);
    const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

    const cleanVideoUrl = sanitizeVideoUrl(reel.videoUrl);

    // Play / Pause boshqaruvi
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !cleanVideoUrl) return;

        if (isActive && !isQuickBuyOpen) {
            setHasError(false);
            v.muted = isMuted;

            const startPlay = () => {
                const playPromise = v.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            setIsPlaying(true);
                            setIsBuffering(false);
                        })
                        .catch((err) => {
                            console.warn("Autoplay blocked, trying muted:", err);
                            // Agar audio tufayli bloklansa, darhol muted qilib qayta o'ynatamiz
                            v.muted = true;
                            v.play()
                                .then(() => {
                                    setIsPlaying(true);
                                    setIsBuffering(false);
                                })
                                .catch(() => {
                                    setIsPlaying(false);
                                    setIsBuffering(false);
                                });
                        });
                }
            };

            // Agar video allaqachon tayyor bo'lsa darhol boshlaymiz
            if (v.readyState >= 2) {
                startPlay();
            } else {
                v.load();
                const onCanPlay = () => {
                    startPlay();
                    v.removeEventListener("canplay", onCanPlay);
                };
                v.addEventListener("canplay", onCanPlay);
            }
        } else {
            v.pause();
            v.currentTime = 0;
            setIsPlaying(false);
        }
    }, [isActive, isQuickBuyOpen, cleanVideoUrl]);

    // Ovoz o'zgarganda videoga berish
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // Progress bar (requestAnimationFrame)
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

    // Like bosish
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

    // Ekran bosilganda (Click / Tap)
    const handleScreenClick = (e: React.MouseEvent) => {
        // Agar tugmalar yoki mahsulot kartochkasi bosilgan bo'lsa, bu yer ishlamaydi
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest("[data-clickable]")) return;

        const now = Date.now();
        const diff = now - lastTapRef.current;

        if (diff < 280) {
            // Double Tap: Like + Flying Heart
            if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setFlyingHeart({ x, y });
            handleLike(true);
            setTimeout(() => setFlyingHeart(null), 850);
        } else {
            // Single Tap: Play / Pause yoki Ovozni yoqish/o'chirish
            tapTimerRef.current = setTimeout(() => {
                videoPreWarmer.triggerHaptic("light");
                const v = videoRef.current;
                if (!v) return;

                if (isMuted) {
                    // Agar ovozsiz bo'lsa, birinchi chertishda ovozni yoqamiz
                    toggleMute();
                    setSoundPill(false);
                    setTimeout(() => setSoundPill(null), 800);
                } else {
                    // Agar ovozli bo'lsa, play/pause
                    if (v.paused) {
                        v.play().then(() => setIsPlaying(true)).catch(() => {});
                    } else {
                        v.pause();
                        setIsPlaying(false);
                    }
                }
            }, 280);
        }
        lastTapRef.current = now;
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

    const fmtPrice = (n?: number) => {
        if (!n) return "0 so'm";
        return n.toLocaleString("ru-RU") + (language === "ru" ? " сум" : " so'm");
    };

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
                onClick={handleScreenClick}
                className={`relative w-full h-full bg-black flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    isQuickBuyOpen ? "scale-[0.94] brightness-50 blur-[2px] rounded-3xl" : "scale-100"
                }`}
            >
                {/* Poster orqada doim turadi — video yuklanguncha qora ekran bo'lmaydi */}
                {reel.image && !isPlaying && (
                    <img
                        src={reel.image}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                {/* HTML5 Hardware Accelerated Video */}
                {cleanVideoUrl ? (
                    <video
                        ref={videoRef}
                        src={cleanVideoUrl}
                        className="w-full h-full object-cover"
                        loop
                        playsInline
                        webkit-playsinline="true"
                        muted={isMuted}
                        preload={isActive ? "auto" : (isNearby ? "metadata" : "none")}
                        onWaiting={() => setIsBuffering(true)}
                        onPlaying={() => {
                            setIsBuffering(false);
                            setIsPlaying(true);
                        }}
                        onCanPlay={() => setIsBuffering(false)}
                        onPause={() => setIsPlaying(false)}
                        onError={(e) => {
                            console.error("Video error on reel:", cleanVideoUrl, e);
                            setHasError(true);
                            setIsBuffering(false);
                        }}
                    />
                ) : (
                    <div className="text-white/50 text-sm font-semibold flex flex-col items-center gap-2">
                        <AlertCircle size={32} />
                        <span>Video manzili mavjud emas</span>
                    </div>
                )}

                {/* Video xatolik bersa */}
                {hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-3 p-4 text-center z-30">
                        <AlertCircle size={40} className="text-red-400" />
                        <p className="text-xs text-white/80">Videoni yuklab bo'lmadi</p>
                        <button
                            data-clickable="true"
                            onClick={(e) => {
                                e.stopPropagation();
                                setHasError(false);
                                setIsBuffering(true);
                                if (videoRef.current) {
                                    videoRef.current.load();
                                    videoRef.current.play().catch(() => {});
                                }
                            }}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                        >
                            Qayta urinish
                        </button>
                    </div>
                )}

                {/* Buffering indikatori */}
                {isBuffering && !hasError && isActive && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/20 pointer-events-none">
                        <Loader2 size={44} className="text-white animate-spin opacity-80" />
                    </div>
                )}

                {/* Play / Pause belgisi (faqat foydalanuvchi o'zi pauza qilganda) */}
                {!isPlaying && !isBuffering && !hasError && !isQuickBuyOpen && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="w-18 h-18 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 animate-in zoom-in-75 duration-200">
                            <Play size={34} className="text-white fill-white ml-1" />
                        </div>
                    </div>
                )}

                {/* Double-tap uchuvchi yurakcha */}
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

                {/* Ovoz holati (Markazda animatsiya) */}
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

            {/* Right Side Action Bar (Mobile App uslubida) */}
            <div className="absolute bottom-24 right-3.5 flex flex-col items-center gap-5 z-40">
                {/* Ovoz tugmasi */}
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

                {/* Like tugmasi */}
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

                {/* Izoh tugmasi */}
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

                {/* Ulashish (Share) */}
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
            </div>

            {/* Bottom Product Info & Quick Buy Card (Mobile App uslubida) */}
            <div className="absolute bottom-5 left-3.5 right-18 z-40 space-y-2.5">
                {/* Tovar nomi */}
                <h3 className="text-sm font-bold text-white line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pr-2">
                    {reel[`name_${language}`] || reel.name}
                </h3>

                {/* Mobil ilovadagi kabi tovar kartochkasi */}
                <div
                    data-clickable="true"
                    onClick={(e) => {
                        e.stopPropagation();
                        videoPreWarmer.triggerHaptic("medium");
                        setIsQuickBuyOpen(true);
                    }}
                    className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-xl p-2 pr-3.5 rounded-2xl border border-white/25 active:scale-95 transition-all cursor-pointer shadow-lg"
                >
                    {reel.image && (
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/30 shrink-0 border border-white/20">
                            <img src={reel.image} className="w-full h-full object-cover" alt="" />
                        </div>
                    )}

                    <div className="flex flex-col min-w-0 pr-1">
                        <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                            {language === "uz" ? "Xarid qilish" : "Купить"}
                        </span>
                        <span className="text-xs font-black text-white">
                            {fmtPrice(reel.price)}
                        </span>
                    </div>

                    <ChevronRight size={16} className="text-white/80 shrink-0 ml-1" />
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
