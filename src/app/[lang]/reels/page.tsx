"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { Loader2, ChevronLeft, Camera, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { Reel } from "@/types";
import { SingleReel } from "@/components/reels/SingleReel";
import { CommentsSheet } from "@/components/reels/CommentsSheet";
import { videoPreWarmer } from "@/lib/videoPreWarmer";
import { sanitizeVideoUrl } from "@/lib/video-url";

// Active reel atrofida 2 ta oldingi va 2 ta keyingi reel DOMda saqlanadi
const WINDOW = 2;

export default function ReelsPage() {
    const router = useRouter();
    const { language, showToast } = useStore();
    const t = translations[language];

    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [commentProductId, setCommentProductId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchReelsData = async () => {
            try {
                // Ham reels, ham video_url bor mahsulotlarni olamiz
                const [reelsRes, productsRes] = await Promise.all([
                    supabase.from("reels").select("*").limit(40),
                    supabase
                        .from("products")
                        .select("id,name,name_uz,name_ru,price,images,image,video_url,stock_details,category_id")
                        .not("video_url", "is", null)
                        .neq("video_url", "")
                        .limit(40),
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

                const productItems: Reel[] = [];
                for (const p of productsRes.data || []) {
                    if (!p.video_url) continue;
                    const img = p.image || (Array.isArray(p.images) ? p.images[0] : null) || "/placeholder.png";
                    const rawUrls = String(p.video_url).split(/[;,]/).map((u) => sanitizeVideoUrl(u)).filter(Boolean);
                    rawUrls.forEach((vUrl, uIdx) => {
                        productItems.push({
                            id: `${p.id}-${uIdx}`,
                            videoUrl: vUrl,
                            productId: String(p.id),
                            name: p.name || "",
                            name_uz: p.name_uz || p.name || "",
                            name_ru: p.name_ru || p.name || "",
                            price: Number(p.price) || 0,
                            image: img,
                            stockDetails: p.stock_details || null,
                        });
                    });
                }

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
                const urls = sorted.map((s) => s.videoUrl).filter(Boolean);
                videoPreWarmer.prewarmUpcoming(urls, 0);
            } catch (error) {
                console.error("[ReelsPage] Error fetching reels:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReelsData();
    }, []);

    // ActiveIndex o'zgarganda navbatdagi videolarni orqa fonda isitish
    useEffect(() => {
        if (reels.length > 0) {
            const urls = reels.map((r) => r.videoUrl).filter(Boolean);
            videoPreWarmer.prewarmUpcoming(urls, activeIndex);
        }
    }, [activeIndex, reels]);

    // Aniq va tezkor skroll kuzatuvchi: 50% chegaradan o'tishi bilan darhol yangi reel faollashadi (zero lag)
    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;

        const h = el.clientHeight;
        if (h <= 0) return;

        const newIndex = Math.round(el.scrollTop / h);
        if (newIndex !== activeIndex && newIndex >= 0 && newIndex < reels.length) {
            setActiveIndex(newIndex);
        }
    }, [activeIndex, reels.length]);

    if (loading) {
        return (
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black">
                <Loader2 size={40} className="text-white animate-spin mb-3 opacity-80" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Loading Reels</p>
            </div>
        );
    }

    if (reels.length === 0) {
        return (
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black text-white gap-3 p-4">
                <p className="text-sm font-semibold opacity-70">
                    {language === "uz" ? "Hech qanday video topilmadi" : "Видео не найдены"}
                </p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-white/20 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                >
                    {language === "uz" ? "Orqaga qaytish" : "Назад"}
                </button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100dvh-58px)] md:h-[calc(100vh-40px)] w-full bg-black relative flex flex-col items-center justify-center overflow-hidden py-0 md:py-3">
            {/* Main Instagram Phone Frame Container */}
            <div
                className="w-full max-w-[480px] h-full relative overflow-hidden bg-black md:rounded-[32px] md:border md:border-white/15 md:shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col"
            >
                {/* ── Official Instagram Top Header ── */}
                <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-3.5 pb-8 flex items-center justify-between bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-auto">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => router.back()}
                            className="p-1 active:scale-75 transition-transform text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
                            aria-label="Back"
                        >
                            <ChevronLeft size={27} strokeWidth={2.6} />
                        </button>
                        <h1 className="text-[20px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                            Reels
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Quick Mute / Unmute Indicator Button */}
                        <button
                            onClick={() => {
                                videoPreWarmer.triggerHaptic("light");
                                setIsMuted(!isMuted);
                            }}
                            className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full border border-white/20 active:scale-90 transition-transform shadow-lg"
                            aria-label="Toggle sound"
                        >
                            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                        </button>

                        {/* Instagram Camera Icon */}
                        <button
                            onClick={() => {
                                videoPreWarmer.triggerHaptic("light");
                                showToast(
                                    language === "uz" ? "Tez orada video yuklash imkoni ochiladi!" : "Скоро появится загрузка видео!",
                                    "info"
                                );
                            }}
                            className="p-2 text-white active:scale-90 transition-transform drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
                            aria-label="Camera"
                        >
                            <Camera size={23} strokeWidth={2.2} />
                        </button>
                    </div>
                </div>

                {/* ── Main Reels Vertical Snap Container ── */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black relative flex flex-col"
                    style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        WebkitOverflowScrolling: "touch",
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
