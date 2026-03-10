"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, MessageSquare, Share2, ShoppingBag, Plus, Sparkles, ChevronRight, Volume2, VolumeX, Play, Loader2 } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/store/store";
import { db, doc, updateDoc, increment } from "@/lib/firebase";

interface SingleReelProps {
    reel: any;
    isActive: boolean;
    isMuted: boolean;
    toggleMute: () => void;
    onCommentOpen: (productId: string) => void;
    language: "uz" | "ru";
    t: any;
}

export const SingleReel = ({ 
    reel, isActive, isMuted, toggleMute, onCommentOpen, language, t 
}: SingleReelProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { user, showToast, addToCart, cart } = useStore();
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);

    useEffect(() => {
        if (videoRef.current) {
            if (isActive) {
                videoRef.current.play().catch(() => setIsPlaying(false));
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isActive]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(p);
        }
    };

    const handleLike = async () => {
        if (!user) {
            showToast(language === 'uz' ? "Yoqtirish uchun tizimga kiring" : "Войдите, чтобы поставить лайк", 'info');
            return;
        }
        setLiked(!liked);
        setLikesCount((prev: number) => liked ? prev - 1 : prev + 1);
        try {
            await updateDoc(doc(db, "reels", reel.id), {
                likesCount: increment(liked ? -1 : 1)
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: reel[`name_${language}`] || reel.name,
                url: window.location.href
            });
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const inCart = cart.find(item => item.id === reel.id);

    return (
        <div className="relative w-full h-[100dvh] snap-start bg-black overflow-hidden flex flex-col items-center justify-center">
            {/* Video Background */}
            <video
                ref={videoRef}
                src={reel.videoUrl}
                className="w-full h-full object-cover"
                loop
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
            />

            {/* Content Top Overlay */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-50">
                <div 
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Buffering Indicator */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/10">
                    <Loader2 size={48} className="text-white animate-spin opacity-50" />
                </div>
            )}

            {/* Play/Pause Large Indicator */}
            {!isPlaying && !isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="w-20 h-20 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 animate-in zoom-in duration-300">
                        <Play size={40} className="text-white fill-white ml-2" />
                    </div>
                </div>
            )}

            {/* Side Actions */}
            <div className="absolute bottom-24 right-4 flex flex-col items-center gap-6 z-40">
                {/* Mute Toggle */}
                <button 
                    onClick={toggleMute}
                    className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all text-white"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <div className="flex flex-col items-center gap-1 group">
                    <button 
                        onClick={handleLike}
                        className={`w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all ${liked ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-white'}`}
                    >
                        <Heart size={24} fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 0 : 2.5} />
                    </button>
                    <span className="text-[10px] font-black uppercase text-white drop-shadow-lg">{likesCount}</span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                    <button 
                        onClick={() => onCommentOpen(reel.productId || reel.id)}
                        className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all text-white"
                    >
                        <MessageSquare size={22} strokeWidth={2.5} />
                    </button>
                    <span className="text-[10px] font-black uppercase text-white drop-shadow-lg">{reel.commentCount || 0}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <button 
                        onClick={handleShare}
                        className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all text-white"
                    >
                        <Share2 size={22} strokeWidth={2.5} />
                    </button>
                    <span className="text-[10px] font-black uppercase text-white drop-shadow-lg">SHARE</span>
                </div>
            </div>

            {/* Product Card & Info */}
            <div className="absolute bottom-4 left-4 right-20 z-40 space-y-4">
                {/* Product Float Card */}
                <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-2xl p-3 pr-5 rounded-[24px] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-left duration-700">
                    <Link href={`/products/${reel.id}`} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 shrink-0">
                            <img src={reel.image} className="w-full h-full object-cover" alt={reel.name} />
                            <div className="absolute top-0 right-0 p-1 bg-yellow-400 rounded-bl-lg shrink-0">
                                <Sparkles size={8} className="text-white fill-white" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-[11px] font-black text-black uppercase tracking-tighter line-clamp-1 w-32">{reel[`name_${language}`] || reel.name}</h4>
                            <span className="text-[13px] font-black italic text-[#6335ED] italic">{reel.price.toLocaleString()} $</span>
                        </div>
                    </Link>
                    <div className="h-8 w-[1px] bg-gray-200/50 mx-1 shrink-0" />
                    {inCart ? (
                        <Link href="/cart" className="p-3 bg-[#E4D9FF] text-[#6335ED] rounded-2xl shrink-0"><ShoppingBag size={18} strokeWidth={3} /></Link>
                    ) : (
                        <button 
                            onClick={() => addToCart({ ...reel, quantity: 1 })}
                            className="p-3 bg-black text-white rounded-2xl shadow-lg active:scale-90 transition-all shrink-0"
                        >
                            <Plus size={18} strokeWidth={3} />
                        </button>
                    )}
                </div>

                {/* Reel Info */}
                <div className="space-y-2 max-w-[80%]">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                            <Volume2 size={12} className="text-white" />
                        </div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-lg marquee-text overflow-hidden whitespace-nowrap">
                            Original Sound • {reel.category} Collection
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Gradient overlay */}
             <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
        </div>
    );
};
