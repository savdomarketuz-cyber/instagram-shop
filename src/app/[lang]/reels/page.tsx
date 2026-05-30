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
                    price: p.price,
                    image: p.image,
                })) as Reel[];

                const seen = new Set(reelItems.map(r => r.id));
                const merged = [...reelItems, ...productItems.filter(p => !seen.has(p.id))];
                setReels(merged.sort(() => Math.random() - 0.5));
            } catch (error) {
                console.error("Error fetching reels:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReelsData();
    }, []);

    // Har bir reel div'iga observer ulanadi
    const observe = useCallback((node: HTMLDivElement | null, index: number) => {
        if (!node || !observerRef.current) return;
        node.dataset.index = String(index);
        observerRef.current.observe(node);
    }, []);

    // Intersection Observer scroll handler o'rnida -- ancha silliq.
    // Reel 60%+ ko'ringanda active bo'ladi (har scroll pikselda hisoblanmaydi).
    useEffect(() => {
        if (!containerRef.current) return;
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        const idx = Number((entry.target as HTMLElement).dataset.index);
                        if (!Number.isNaN(idx)) setActiveIndex(idx);
                    }
                });
            },
            { root: containerRef.current, threshold: [0.6] }
        );
        return () => observerRef.current?.disconnect();
    }, [reels.length]);

    if (loading) return (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black">
            <Loader2 size={48} className="text-white animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Loading Reels</p>
        </div>
    );

    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-96px)] w-full bg-black relative flex flex-col items-center justify-center overflow-hidden">
            {/* Main Scroll Container */}
            <div
                ref={containerRef}
                className="w-full max-w-[500px] h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black shadow-2xl relative"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    transform: 'translateZ(0)', // GPU layer -- scroll lag kamayadi
                }}
            >
                {reels.map((reel, index) => {
                    // HAQIQIY virtualizatsiya: faqat oyna ichidagilar og'ir DOM bilan chiziladi.
                    const inWindow = index >= activeIndex - WINDOW && index <= activeIndex + WINDOW;

                    if (!inWindow) {
                        // Bo'sh placeholder: scroll balandligi to'g'ri qoladi, lekin og'ir element yo'q
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
            <div className="absolute top-10 left-6 z-[60] flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-3 bg-black/20 backdrop-blur-xl text-white rounded-full border border-white/20 active:scale-95 transition-all shadow-xl"
                >
                    <ChevronLeft size={24} strokeWidth={3} />
                </button>
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg scale-110">REELS</h1>
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
