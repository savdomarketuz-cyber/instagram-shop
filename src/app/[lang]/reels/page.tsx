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
import { sanitizeVideoUrl } from "@/lib/video-url";

// Active reel atrofida 2 ta oldingi va 2 ta keyingi reel render qilinadi
const WINDOW = 2;

export default function ReelsPage() {
    const router = useRouter();
    const { language } = useStore();
    const t = translations[language];

    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [commentProductId, setCommentProductId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchReelsData = async () => {
            try {
                // Ham reels, ham video_url bor mahsulotlarni olamiz (xuddi Flutter ilovadagidek)
                const [reelsRes, productsRes] = await Promise.all([
                    supabase.from("reels").select("*").limit(30),
                    supabase
                        .from("products")
                        .select("id,name,name_uz,name_ru,price,images,image,video_url,stock_details,category_id")
                        .not("video_url", "is", null)
                        .neq("video_url", "")
                        .limit(30),
                ]);

                const reelItems: Reel[] = (reelsRes.data || [])
                    .filter((r: any) => Boolean(r.video_url))
                    .map((r: any) => ({
                        id: String(r.id),
                        videoUrl: sanitizeVideoUrl(r.video_url),
                        likesCount: Number(r.likes_count) || 0,
                        commentCount: Number(r.comment_count) || 0,
                        productId: r.product_id ? String(r.product_id) : undefined,
                        name: r.name || "",
                        price: Number(r.price) || 0,
                        image: r.image || r.thumbnail_url || "/placeholder.png",
                    }));

                const productItems: Reel[] = (productsRes.data || [])
                    .filter((p: any) => Boolean(p.video_url))
                    .map((p: any) => {
                        const img = p.image || (Array.isArray(p.images) ? p.images[0] : null) || "/placeholder.png";
                        return {
                            id: String(p.id),
                            videoUrl: sanitizeVideoUrl(p.video_url),
                            productId: String(p.id),
                            name: p.name || "",
                            name_uz: p.name_uz || p.name || "",
                            name_ru: p.name_ru || p.name || "",
                            price: Number(p.price) || 0,
                            image: img,
                            stockDetails: p.stock_details || null,
                        };
                    });

                // Takrorlanuvchi video havolalarini filtrlaymiz
                const seenUrls = new Set<string>();
                const merged: Reel[] = [];
                for (const item of [...reelItems, ...productItems]) {
                    if (item.videoUrl && !seenUrls.has(item.videoUrl)) {
                        seenUrls.add(item.videoUrl);
                        merged.push(item);
                    }
                }

                // Tasodifiy tartibda aralashtiramiz
                const sorted = merged.sort(() => Math.random() - 0.5);
                setReels(sorted);

                // Dastlabki videolarni orqa fonda isitish
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

    // ActiveIndex o'zgarganda navbatdagi videolarni isitib qo'yish
    useEffect(() => {
        if (reels.length > 0) {
            const urls = reels.map(r => r.videoUrl).filter(Boolean);
            videoPreWarmer.prewarmUpcoming(urls, activeIndex);
        }
    }, [activeIndex, reels]);

    // Aniq skroll hisoblagich: Snapped indexni 100% ishonchli aniqlaydi
    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

        scrollTimeoutRef.current = setTimeout(() => {
            const h = el.clientHeight;
            if (h <= 0) return;
            const newIndex = Math.round(el.scrollTop / h);
            if (newIndex !== activeIndex && newIndex >= 0 && newIndex < reels.length) {
                setActiveIndex(newIndex);
            }
        }, 60);
    }, [activeIndex, reels.length]);

    if (loading) return (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black">
            <Loader2 size={44} className="text-white animate-spin mb-3 opacity-80" />
            <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Loading Reels</p>
        </div>
    );

    if (reels.length === 0) return (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black text-white gap-3 p-4">
            <p className="text-sm font-semibold opacity-70">Hech qanday video topilmadi</p>
            <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white/20 rounded-xl text-xs font-bold active:scale-95 transition-transform"
            >
                Orqaga qaytish
            </button>
        </div>
    );

    return (
        <div className="h-[calc(100dvh-58px)] md:h-[calc(100vh-96px)] w-full bg-black relative flex flex-col items-center justify-center overflow-hidden">
            {/* Main Reels Snap Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full max-w-[500px] h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black shadow-2xl relative flex flex-col"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {reels.map((reel, index) => {
                    const inWindow = index >= activeIndex - WINDOW && index <= activeIndex + WINDOW;
                    const isNearby = index >= activeIndex - 1 && index <= activeIndex + 1;

                    if (!inWindow) {
                        return (
                            <div
                                key={reel.id}
                                className="w-full h-full snap-start shrink-0 bg-black"
                            />
                        );
                    }

                    return (
                        <div
                            key={reel.id}
                            className="w-full h-full snap-start shrink-0 relative"
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

            {/* Global Back Button */}
            <div className="absolute top-5 left-4 z-[60] flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2.5 bg-black/40 backdrop-blur-xl text-white rounded-full border border-white/20 active:scale-90 transition-all shadow-xl"
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
