"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useStore } from "@/store/store";
import { db, collection, getDocs, query, where, limit } from "@/lib/firebase";
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
                // Fetch reels from 'reels' collection OR from products that have videoUrl
                const reelsSnap = await getDocs(query(collection(db, "reels"), limit(20)));
                let fetchedReels = reelsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reel[];

                // If not enough reels, fetch products with videos
                if (fetchedReels.length < 5) {
                    const productsSnap = await getDocs(query(collection(db, "products"), where("videoUrl", "!=", ""), limit(20)));
                    const productReels = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reel[];
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
        <div className="h-[100dvh] w-full bg-black relative flex flex-col items-center justify-center">
             {/* Main Scroll Container */}
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black"
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
