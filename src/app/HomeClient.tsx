"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { Search, Loader2, Heart } from "lucide-react";
import Logo from "@/components/Logo";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { mapProduct, mapBanner } from "@/lib/mappers";
import { getAiRecommendations } from "@/lib/ai";
import { translations } from "@/lib/translations";
import { useSearchParams } from "next/navigation";

// Components
import { BannerSection } from "@/components/home/BannerSection";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { ProductGrid } from "@/components/home/ProductGrid";

import type { Product, Category, Banner } from "@/types";

interface HomeClientProps {
    initialProducts: Product[];
    initialCategories: Category[];
    initialBanners: Banner[];
    initialBannerSettings: { desktopHeight: number; borderRadius: number };
}

export default function HomeClient({ 
    initialProducts, 
    initialCategories, 
    initialBanners, 
    initialBannerSettings 
}: HomeClientProps) {
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get("category");

    const {
        addToCart, cart, toggleWishlist, wishlist, updateQuantity,
        removeFromCart, user, setCachedProducts,
        setCachedCategories, language,
        homeScrollPosition, setHomeScrollPosition, homeSearchQuery, setHomeSearchQuery,
        homeActiveFilter, setHomeActiveFilter, homeActiveTab, setHomeActiveTab
    } = useStore();

    const t = translations[language];
    
    // UI State
    const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
    const [aiProductIds, setAiProductIds] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>(initialCategories);
    const [banners, setBanners] = useState<Banner[]>(initialBanners);
    const [search, setSearch] = useState(homeSearchQuery);
    const [activeFilter, setActiveFilter] = useState(urlCategory || homeActiveFilter);
    const [activeParent, setActiveParent] = useState("all");
    const [activeTab, setActiveTab] = useState(homeActiveTab);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(initialProducts.length >= 20);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [bannerSettings, setBannerSettings] = useState(initialBannerSettings);

    const observerTarget = useRef(null);

    // Sync activeFilter with URL category if it changes
    useEffect(() => {
        if (urlCategory) {
            setActiveFilter(urlCategory);
            setHomeActiveFilter(urlCategory);
        }
    }, [urlCategory, setHomeActiveFilter]);

    // AI Recommendations logic
    useEffect(() => {
        if (user?.phone && allProducts.length > 0) {
            const fetchAiRecs = async () => {
                const { data: interests } = await supabase
                    .from("user_interests")
                    .select("*")
                    .eq("id", user.phone)
                    .single();
                
                if (interests) {
                    const ids = await getAiRecommendations(interests, allProducts, user.phone);
                    if (ids && ids.length > 0) setAiProductIds(ids);
                }
            };
            fetchAiRecs();
        }
    }, [user?.phone, allProducts.length]);

    // Real-time updates for Banners and Settings (Supabase Realtime)
    useEffect(() => {
        const bannersChannel = supabase
            .channel('banners-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, async () => {
                const { data } = await supabase.from('banners').select('*').eq('active', true).order('order_index');
                setBanners((data || []).map(mapBanner));
            })
            .subscribe();

        const settingsChannel = supabase
            .channel('settings-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.banners' }, (payload: any) => {
                if (payload.new && payload.new.data) {
                    setBannerSettings({
                        desktopHeight: payload.new.data.desktopHeight || 210,
                        borderRadius: payload.new.data.borderRadius || 32
                    });
                }
            })
            .subscribe();

        if (homeScrollPosition > 0) {
            window.scrollTo({ top: homeScrollPosition, behavior: 'instant' as ScrollBehavior });
        }

        let timeoutId: NodeJS.Timeout;
        const handleScrollEvent = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setHomeScrollPosition(window.scrollY);
            }, 300);
        };

        window.addEventListener('scroll', handleScrollEvent);

        return () => {
            supabase.removeChannel(bannersChannel);
            supabase.removeChannel(settingsChannel);
            window.removeEventListener('scroll', handleScrollEvent);
        };
    }, []);

    // Re-fetch when filters change (reset pagination)
    useEffect(() => {
        const isDefault = activeFilter === 'all' && activeTab === 'for_you' && !search;
        if (!isDefault || allProducts.length === 0) {
            fetchProducts(false);
        }
    }, [activeFilter, activeTab, search]);

    const fetchProducts = async (isLoadMore = false) => {
        if (isLoadMore && (!hasMore || isFetchingMore)) return;

        if (isLoadMore) setIsFetchingMore(true);
        else {
            setLoading(true);
            setPageNumber(0);
        }

        try {
            const currentPage = isLoadMore ? pageNumber + 1 : 0;
            const from = currentPage * 20;
            const to = from + 19;

            let query = supabase
                .from("products")
                .select("*")
                .eq("is_deleted", false);

            if (activeFilter !== 'all') {
                const targetCategory = allCategories.find(c => c.id === activeFilter || c.name === activeFilter);
                if (targetCategory) {
                    query = query.eq("category_id", targetCategory.id);
                }
            }

            if (search.trim()) {
                query = query.ilike("name", `%${search}%`);
            }

            if (activeTab === "popular") {
                query = query.order("sales", { ascending: false });
            } else {
                query = query.order("created_at", { ascending: false });
            }

            const { data: newProductsData, error } = await query.range(from, to);
            
            if (error) throw error;

            const newProducts = (newProductsData || []).map(mapProduct);

            const availableProducts = newProducts.filter(p => {
                const totalStock = p.stockDetails ? Object.values(p.stockDetails).reduce((a: number, b: number) => a + (Number(b) || 0), 0) : (p.stock || 0);
                return totalStock > 0;
            });

            if (isLoadMore) {
                setAllProducts(prev => [...prev, ...availableProducts]);
                setPageNumber(currentPage);
            } else {
                setAllProducts(availableProducts);
                if (activeFilter === 'all' && !search) setCachedProducts(availableProducts);
            }

            setHasMore(newProducts.length === 20);
        } catch (error) {
            console.error("Home Data Fetch failed:", error);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loading && !isFetchingMore) {
                fetchProducts(true);
            }
        }, { threshold: 0.1, rootMargin: '200px' });

        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, loading, isFetchingMore, pageNumber]);

    return (
        <main className="min-h-screen bg-white pb-24 max-w-[1440px] mx-auto">
            <h1 className="sr-only">Velari - Premium Electronics Store in Uzbekistan. Gadgets, Smartphones and Accessories.</h1>
            
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-4 md:px-10 py-3 md:py-6 border-b border-gray-100 flex items-center gap-3 md:gap-8">
                <Link href="/" className="hidden md:block group transition-transform active:scale-95">
                    <Logo size="md" className="!items-start" />
                </Link>
                <div className="flex-1 relative max-w-2xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={t.common.search}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setHomeSearchQuery(e.target.value);
                        }}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 md:py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/wishlist" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-all active:scale-90 flex items-center gap-2">
                        <Heart size={22} fill={wishlist.length > 0 ? "#ef4444" : "none"} className={wishlist.length > 0 ? "text-red-500" : ""} />
                        <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-black/40">Saralanganlar</span>
                    </Link>
                </div>
            </div>

            <BannerSection 
                banners={banners} 
                bannerSettings={bannerSettings} 
                currentBanner={currentBanner} 
                setCurrentBanner={setCurrentBanner} 
                language={language} 
            />

            <div className="md:px-10">
                <CategoryFilter 
                    allCategories={allCategories}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeParent={activeParent}
                    setActiveParent={setActiveParent}
                    language={language}
                    translations={t}
                    setHomeActiveFilter={setHomeActiveFilter}
                />
            </div>

            <div className="px-2 md:px-10 mt-4">
                <div className="flex items-center justify-around relative mx-2 mb-6 border-b border-gray-50">
                    {["for_you", "popular"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setHomeActiveTab(tab); }}
                            className={`flex-1 py-3 text-center transition-all relative ${activeTab === tab ? "text-black font-black" : "text-gray-400 font-bold"}`}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                                <span className="text-xs uppercase tracking-tight">
                                    {tab === "for_you" ? (language === 'uz' ? 'Siz uchun' : 'Для вас') : (language === 'uz' ? 'Ommabop' : 'Популярное')}
                                </span>
                                {tab === "for_you" && aiProductIds.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">AI</span>
                                )}
                            </div>
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7000FF] rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                <ProductGrid 
                    products={allProducts}
                    loading={loading && allProducts.length === 0}
                    language={language}
                    t={t}
                    cart={cart}
                    wishlist={wishlist}
                    user={user}
                    toggleWishlist={toggleWishlist}
                    addToCart={addToCart}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                />
            </div>

            <div ref={observerTarget} className="h-40 flex flex-col items-center justify-center gap-4">
                {isFetchingMore && (
                    <>
                        <Loader2 className="animate-spin text-black/20" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Yuklanmoqda...</span>
                    </>
                )}
                {!hasMore && allProducts.length > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/10">Barcha mahsulotlar ko&apos;rsatildi</span>
                )}
            </div>
        </main>
    );
}
