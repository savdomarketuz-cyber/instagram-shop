"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { Loader2, Plus, ChevronLeft, Volume2, VolumeX, ShoppingBag, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reel } from "@/types";
import { SingleReel } from "@/components/reels/SingleReel";
import { CommentsSheet } from "@/components/reels/CommentsSheet";

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

    useEffect(() => {
        const fetchReelsData = async () => {
            try {
                // Fetch from 'reels' table
                const { data: reelsData } = await supabase
                    .from("reels")
                    .select("*")
                    .limit(20);
                
                let fetchedReels = (reelsData || []).map(r => ({
                    id: r.id,
                    videoUrl: r.video_url,
                    likesCount: r.likes_count,
                    commentCount: r.comment_count,
                    productId: r.product_id,
                    name: r.name,
                    price: r.price,
                    image: r.image
                })) as Reel[];

                // If not enough reels, fetch products with videos
                if (fetchedReels.length < 5) {
                    const { data: productsWithVideos } = await supabase
                        .from("products")
                        .select("*")
                        .not("video_url", "is", null)
                        .neq("video_url", "")
                        .limit(20);
                    
                    const productReels = (productsWithVideos || []).map(p => ({
                        id: p.id,
                        videoUrl: p.video_url,
                        productId: p.id,
                        name: p.name,
                        price: p.price,
                        image: p.image
                    })) as Reel[];

                    fetchedReels = [...fetchedReels, ...productReels.filter(pr => !fetchedReels.find(fr => fr.id === pr.id))];
                }

                setReels(fetchedReels.sort(() => Math.random() - 0.5));
            } catch (error) {
                console.error("Error fetching reels:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReelsData();
    }, []);

    const handleScroll = () => {
        if (containerRef.current) {
            const index = Math.round(containerRef.current.scrollTop / containerRef.current.offsetHeight);
            if (index !== activeIndex) {
                 setActiveIndex(index);
            }
        }
    };

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
                onScroll={handleScroll}
                className="w-full max-w-[500px] h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black shadow-2xl relative"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {reels.map((reel, index) => (
                    <SingleReel 
                        key={reel.id}
                        reel={reel}
                        isActive={activeIndex === index && !commentProductId}
                        isMuted={isMuted}
                        toggleMute={() => setIsMuted(!isMuted)}
                        onCommentOpen={(pid) => setCommentProductId(pid)}
                        language={language}
                        t={t}
                    />
                ))}
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
