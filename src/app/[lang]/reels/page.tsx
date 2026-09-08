"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { Loader2, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Reel } from "@/types";
import { SingleReel } from "@/components/reels/SingleReel";
import { CommentsSheet } from "@/components/reels/CommentsSheet";
import { videoPreWarmer } from "@/lib/videoPreWarmer";

// Faqat shuncha reel atrofida to'liq DOM chiziladi: active +/- WINDOW
const WINDOW = 2;

export default function ReelsPage() {
    const router = useRouter();
    const { language } = useStore();
    const t = translations[language];

    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [commentProductId, setCommentProductId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const fetchReelsData = async () => {
            try {
                const [reelsRes, productsRes] = await Promise.all([
                    supabase.from("reels").select("*").limit(20),
                    supabase.from("products").select("*").not("video_url", "is", null).neq("video_url", "").limit(20),
                ]);

                const reelItems = (reelsRes.data || []).map(r => ({
                    id: r.id,
                    videoUrl: r.video_url,
                    likesCount: r.likes_count,
                    commentCount: r.comment_count,
                    productId: r.product_id,
                    name: r.name,
                    price: r.price,
                    image: r.image,
                })) as Reel[];

                const productItems = (productsRes.data || []).map(p => ({
                    id: p.id,
                    videoUrl: p.video_url,
                    productId: p.id,
                    name: p.name,
                    name_uz: p.name_uz,
                    name_ru: p.name_ru,
                    price: p.price,
                    image: p.image || p.imageUrl,
                    stockDetails: p.stockDetails || null,
                })) as Reel[];

                const seen = new Set(reelItems.map(r => r.id));
                const merged = [...reelItems, ...productItems.filter(p => !seen.has(p.id))];
                const sorted = merged.sort(() => Math.random() - 0.5);
                setReels(sorted);

                // Instagram FlashCache: Dastlabki 2 ta videoni darhol pre-warm qilish
                const urls = sorted.map(s => s.videoUrl).filter(Boolean);
                videoPreWarmer.prewarmUpcoming(urls, 0);
            } catch (error) {
                console.error("Error fetching reels:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReelsData();
    }, []);

    // ActiveIndex o'zgarganda keyingi videolarni fonda pre-warm qilish
    useEffect(() => {
        if (reels.length > 0) {
            const urls = reels.map(r => r.videoUrl).filter(Boolean);
            videoPreWarmer.prewarmUpcoming(urls, activeIndex);
        }
    }, [activeIndex, reels]);

    // Har bir reel div'iga observer ulanadi
    const observe = useCallback((node: HTMLDivElement | null, index: number) => {
        if (!node || !observerRef.current) return;
        node.dataset.index = String(index);
        observerRef.current.observe(node);
    }, []);

    // Intersection Observer: 60%+ ko'ringanda activeIndex yangilanadi
    useEffect(() => {
        if (!containerRef.current) return;
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        const idx = Number((entry.target as HTMLElement).dataset.index);
                        if (!Number.isNaN(idx)) {
                            setActiveIndex(idx);
                        }
                    }
                });
            },
            { root: containerRef.current, threshold: [0.6] }
        );
        return () => observerRef.current?.disconnect();
    }, [reels.length]);

    // Mobil swipe boshlanishi bilanoq navbatdagi videolarni uyg'otish (pre-warm on touch)
    const handleTouchStart = () => {
        if (reels.length > 0) {
            const urls = reels.map(r => r.videoUrl).filter(Boolean);
            videoPreWarmer.prewarmUpcoming(urls, activeIndex);
        }
    };

    if (loading) return (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black">
            <Loader2 size={44} className="text-white animate-spin mb-3 opacity-80" />
            <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Loading Reels</p>
        </div>
    );

    return (
        <div className="h-[calc(100dvh-58px)] md:h-[calc(100vh-96px)] w-full bg-black relative flex flex-col items-center justify-center overflow-hidden">
            {/* Main Scroll Container */}
            <div
                ref={containerRef}
                onTouchStart={handleTouchStart}
                className="w-full max-w-[500px] h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black shadow-2xl relative"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    transform: 'translateZ(0)',
                }}
            >
                {reels.map((reel, index) => {
                    const inWindow = index >= activeIndex - WINDOW && index <= activeIndex + WINDOW;

                    if (!inWindow) {
                        return (
                            <div
                                key={reel.id}
                                ref={(n) => observe(n, index)}
                                className="w-full h-full snap-start bg-black"
                            />
                        );
                    }

                    const isNearby = index >= activeIndex - 1 && index <= activeIndex + 2;

                    return (
                        <div
                            key={reel.id}
                            ref={(n) => observe(n, index)}
                            className="w-full h-full snap-start"
                        >
                            <SingleReel
                                reel={reel}
                                isActive={activeIndex === index && !commentProductId}
                                isNearby={isNearby}
                                isMuted={isMuted}
                                toggleMute={() => setIsMuted(!isMuted)}
                                onCommentOpen={(pid) => setCommentProductId(pid)}
                                language={language}
                                t={t}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Global Back Link */}
            <div className="absolute top-5 left-4 z-[60] flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2.5 bg-black/30 backdrop-blur-xl text-white rounded-full border border-white/20 active:scale-90 transition-all shadow-xl"
                >
                    <ChevronLeft size={22} strokeWidth={3} />
                </button>
                <h1 className="text-lg font-black italic uppercase tracking-tight text-white drop-shadow-lg">REELS</h1>
            </div>

            {/* Comments Overlay */}
            {commentProductId && (
                <CommentsSheet
                    productId={commentProductId}
                    onClose={() => setCommentProductId(null)}
                    language={language}
                    t={t}
                />
            )}
        </div>
    );
}
